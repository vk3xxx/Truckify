package stripe

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"

	"github.com/stripe/stripe-go/v76"
	"github.com/stripe/stripe-go/v76/checkout/session"
	"github.com/stripe/stripe-go/v76/subscription"
	"github.com/stripe/stripe-go/v76/webhook"
)

type Client struct {
	webhookSecret string
}

func New() *Client {
	stripe.Key = os.Getenv("STRIPE_SECRET_KEY")
	return &Client{
		webhookSecret: os.Getenv("STRIPE_WEBHOOK_SECRET"),
	}
}

type CheckoutParams struct {
	JobID        string
	PayerID      string
	PayeeID      string
	Amount       int64 // cents
	PlatformFee  int64 // cents
	Description  string
	SuccessURL   string
	CancelURL    string
}

func (c *Client) CreateCheckoutSession(params CheckoutParams) (*stripe.CheckoutSession, error) {
	checkoutParams := &stripe.CheckoutSessionParams{
		PaymentMethodTypes: stripe.StringSlice([]string{"card"}),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
					Currency: stripe.String("aud"),
					ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
						Name:        stripe.String(params.Description),
						Description: stripe.String(fmt.Sprintf("Job ID: %s", params.JobID)),
					},
					UnitAmount: stripe.Int64(params.Amount),
				},
				Quantity: stripe.Int64(1),
			},
		},
		Mode:       stripe.String(string(stripe.CheckoutSessionModePayment)),
		SuccessURL: stripe.String(params.SuccessURL),
		CancelURL:  stripe.String(params.CancelURL),
		Metadata: map[string]string{
			"job_id":       params.JobID,
			"payer_id":     params.PayerID,
			"payee_id":     params.PayeeID,
			"platform_fee": fmt.Sprintf("%d", params.PlatformFee),
		},
	}
	return session.New(checkoutParams)
}

type SubscriptionParams struct {
	UserID     string
	TierID     string
	TierName   string
	Amount     int64 // cents per month
	Annual     bool
	SuccessURL string
	CancelURL  string
}

func (c *Client) CreateSubscriptionCheckout(params SubscriptionParams) (*stripe.CheckoutSession, error) {
	interval := stripe.String(string(stripe.PriceRecurringIntervalMonth))
	amount := params.Amount
	if params.Annual {
		interval = stripe.String(string(stripe.PriceRecurringIntervalYear))
		amount = params.Amount * 10 // 2 months free for annual
	}

	checkoutParams := &stripe.CheckoutSessionParams{
		PaymentMethodTypes: stripe.StringSlice([]string{"card"}),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
					Currency: stripe.String("aud"),
					ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
						Name: stripe.String(fmt.Sprintf("Truckify %s Plan", params.TierName)),
					},
					UnitAmount: stripe.Int64(amount),
					Recurring:  &stripe.CheckoutSessionLineItemPriceDataRecurringParams{Interval: interval},
				},
				Quantity: stripe.Int64(1),
			},
		},
		Mode:       stripe.String(string(stripe.CheckoutSessionModeSubscription)),
		SuccessURL: stripe.String(params.SuccessURL),
		CancelURL:  stripe.String(params.CancelURL),
		Metadata: map[string]string{
			"user_id":   params.UserID,
			"tier_id":   params.TierID,
			"tier_name": params.TierName,
			"annual":    fmt.Sprintf("%t", params.Annual),
		},
		SubscriptionData: &stripe.CheckoutSessionSubscriptionDataParams{
			Metadata: map[string]string{
				"user_id":   params.UserID,
				"tier_id":   params.TierID,
				"tier_name": params.TierName,
			},
		},
	}
	return session.New(checkoutParams)
}

func (c *Client) CancelSubscription(subscriptionID string) error {
	_, err := subscription.Cancel(subscriptionID, nil)
	return err
}

func (c *Client) GetSession(sessionID string) (*stripe.CheckoutSession, error) {
	return session.Get(sessionID, nil)
}

type WebhookEvent struct {
	Type           string
	SessionID      string
	SubscriptionID string
	JobID          string
	PayerID        string
	PayeeID        string
	UserID         string
	TierID         string
	TierName       string
	Annual         bool
	Amount         int64
	Fee            int64
}

func (c *Client) ParseWebhook(r *http.Request) (*WebhookEvent, error) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		return nil, err
	}

	event, err := webhook.ConstructEvent(body, r.Header.Get("Stripe-Signature"), c.webhookSecret)
	if err != nil {
		return nil, err
	}

	we := &WebhookEvent{Type: string(event.Type)}

	switch event.Type {
	case "checkout.session.completed":
		var sess stripe.CheckoutSession
		if err := json.Unmarshal(event.Data.Raw, &sess); err != nil {
			return nil, err
		}
		we.SessionID = sess.ID
		we.Amount = sess.AmountTotal
		we.JobID = sess.Metadata["job_id"]
		we.PayerID = sess.Metadata["payer_id"]
		we.PayeeID = sess.Metadata["payee_id"]
		we.UserID = sess.Metadata["user_id"]
		we.TierID = sess.Metadata["tier_id"]
		we.TierName = sess.Metadata["tier_name"]
		we.Annual = sess.Metadata["annual"] == "true"
		if sess.Subscription != nil {
			we.SubscriptionID = sess.Subscription.ID
		}
		if feeStr, ok := sess.Metadata["platform_fee"]; ok {
			fmt.Sscanf(feeStr, "%d", &we.Fee)
		}

	case "customer.subscription.deleted":
		var sub stripe.Subscription
		if err := json.Unmarshal(event.Data.Raw, &sub); err != nil {
			return nil, err
		}
		we.SubscriptionID = sub.ID
		we.UserID = sub.Metadata["user_id"]
	}

	return we, nil
}
