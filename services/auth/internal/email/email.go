package email

import (
	"bytes"
	"crypto/tls"
	"fmt"
	"html/template"
	"net/smtp"
	"os"
)

type Config struct {
	Host     string
	Port     string
	User     string
	Password string
	From     string
	AppURL   string
}

type Service struct {
	config Config
}

func NewService() *Service {
	return &Service{
		config: Config{
			Host:     os.Getenv("SMTP_HOST"),
			Port:     os.Getenv("SMTP_PORT"),
			User:     os.Getenv("SMTP_USER"),
			Password: os.Getenv("SMTP_PASSWORD"),
			From:     os.Getenv("SMTP_FROM"),
			AppURL:   os.Getenv("APP_URL"),
		},
	}
}

func (s *Service) IsConfigured() bool {
	return s.config.Host != "" && s.config.User != ""
}

func (s *Service) SendVerificationEmail(to, token string) error {
	if !s.IsConfigured() {
		// Log but don't fail if email not configured (dev mode)
		fmt.Printf("[EMAIL] Verification link: %s/verify-email?token=%s\n", s.config.AppURL, token)
		return nil
	}

	subject := "Verify your Truckify account"
	link := fmt.Sprintf("%s/verify-email?token=%s", s.config.AppURL, token)

	body := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.btn{background:#3b82f6;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block}</style></head>
<body>
<h2>Welcome to Truckify!</h2>
<p>Please verify your email address by clicking the button below:</p>
<p><a href="%s" class="btn">Verify Email</a></p>
<p>Or copy this link: %s</p>
<p>This link expires in 24 hours.</p>
<p>If you didn't create an account, please ignore this email.</p>
</body>
</html>`, link, link)

	return s.send(to, subject, body)
}

func (s *Service) SendPasswordResetEmail(to, token string) error {
	if !s.IsConfigured() {
		fmt.Printf("[EMAIL] Password reset link: %s/reset-password?token=%s\n", s.config.AppURL, token)
		return nil
	}

	subject := "Reset your Truckify password"
	link := fmt.Sprintf("%s/reset-password?token=%s", s.config.AppURL, token)

	body := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.btn{background:#3b82f6;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block}</style></head>
<body>
<h2>Password Reset Request</h2>
<p>Click the button below to reset your password:</p>
<p><a href="%s" class="btn">Reset Password</a></p>
<p>Or copy this link: %s</p>
<p>This link expires in 1 hour.</p>
<p>If you didn't request this, please ignore this email.</p>
</body>
</html>`, link, link)

	return s.send(to, subject, body)
}

func (s *Service) send(to, subject, body string) error {
	headers := map[string]string{
		"From":         s.config.From,
		"To":           to,
		"Subject":      subject,
		"MIME-Version": "1.0",
		"Content-Type": "text/html; charset=UTF-8",
	}

	var msg bytes.Buffer
	for k, v := range headers {
		msg.WriteString(fmt.Sprintf("%s: %s\r\n", k, v))
	}
	msg.WriteString("\r\n")
	msg.WriteString(body)

	auth := smtp.PlainAuth("", s.config.User, s.config.Password, s.config.Host)
	addr := fmt.Sprintf("%s:%s", s.config.Host, s.config.Port)

	// Try TLS first
	tlsConfig := &tls.Config{ServerName: s.config.Host}
	conn, err := tls.Dial("tcp", addr, tlsConfig)
	if err != nil {
		// Fallback to regular SMTP
		return smtp.SendMail(addr, auth, s.config.From, []string{to}, msg.Bytes())
	}
	defer conn.Close()

	client, err := smtp.NewClient(conn, s.config.Host)
	if err != nil {
		return err
	}
	defer client.Close()

	if err := client.Auth(auth); err != nil {
		return err
	}
	if err := client.Mail(s.config.From); err != nil {
		return err
	}
	if err := client.Rcpt(to); err != nil {
		return err
	}

	w, err := client.Data()
	if err != nil {
		return err
	}
	_, err = w.Write(msg.Bytes())
	if err != nil {
		return err
	}
	err = w.Close()
	if err != nil {
		return err
	}

	return client.Quit()
}

// Ensure template import is used
var _ = template.New
