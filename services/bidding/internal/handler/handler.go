package handler

import (
	"context"
	"net/http"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"truckify/services/bidding/internal/model"
	"truckify/services/bidding/internal/service"
	"truckify/shared/pkg/response"
	"truckify/shared/pkg/validator"
)

type ServiceInterface interface {
	CreateBid(ctx context.Context, driverID uuid.UUID, req model.CreateBidRequest) (*model.Bid, error)
	GetBid(ctx context.Context, id uuid.UUID) (*model.Bid, error)
	GetBidsForJob(ctx context.Context, jobID uuid.UUID) ([]model.Bid, error)
	GetDriverBids(ctx context.Context, driverID uuid.UUID) ([]model.Bid, error)
	UpdateBid(ctx context.Context, bidID, driverID uuid.UUID, req model.UpdateBidRequest) (*model.Bid, error)
	WithdrawBid(ctx context.Context, bidID, driverID uuid.UUID) error
	AcceptBid(ctx context.Context, bidID uuid.UUID) (*model.Bid, error)
	RejectBid(ctx context.Context, bidID uuid.UUID) error
}

type Handler struct {
	service   ServiceInterface
	validator *validator.Validator
}

func New(svc ServiceInterface) *Handler {
	return &Handler{service: svc, validator: validator.New()}
}

func (h *Handler) RegisterRoutes(router *mux.Router) {
	router.HandleFunc("/bids", h.CreateBid).Methods(http.MethodPost)
	router.HandleFunc("/bids", h.GetDriverBids).Methods(http.MethodGet)
	router.HandleFunc("/bids/{id}", h.GetBid).Methods(http.MethodGet)
	router.HandleFunc("/bids/{id}", h.UpdateBid).Methods(http.MethodPut)
	router.HandleFunc("/bids/{id}", h.WithdrawBid).Methods(http.MethodDelete)
	router.HandleFunc("/bids/{id}/accept", h.AcceptBid).Methods(http.MethodPost)
	router.HandleFunc("/bids/{id}/reject", h.RejectBid).Methods(http.MethodPost)
	router.HandleFunc("/jobs/{job_id}/bids", h.GetJobBids).Methods(http.MethodGet)
}

func (h *Handler) CreateBid(w http.ResponseWriter, r *http.Request) {
	reqID, _ := r.Context().Value("request_id").(string)
	driverID, err := uuid.Parse(r.Header.Get("X-User-ID"))
	if err != nil {
		response.Unauthorized(w, "User not authenticated", "", reqID)
		return
	}

	var req model.CreateBidRequest
	if err := h.validator.DecodeAndValidate(r, &req); err != nil {
		response.BadRequest(w, "Invalid request", err.Error(), reqID)
		return
	}

	bid, err := h.service.CreateBid(r.Context(), driverID, req)
	if err != nil {
		if err == service.ErrBidExists {
			response.Conflict(w, err.Error(), "", reqID)
			return
		}
		response.InternalServerError(w, "Failed to create bid", "", reqID)
		return
	}
	response.Created(w, bid, reqID)
}

func (h *Handler) GetBid(w http.ResponseWriter, r *http.Request) {
	reqID, _ := r.Context().Value("request_id").(string)
	id, err := uuid.Parse(mux.Vars(r)["id"])
	if err != nil {
		response.BadRequest(w, "Invalid bid ID", "", reqID)
		return
	}

	bid, err := h.service.GetBid(r.Context(), id)
	if err != nil {
		if err == service.ErrBidNotFound {
			response.NotFound(w, "Bid not found", "", reqID)
			return
		}
		response.InternalServerError(w, "Failed to get bid", "", reqID)
		return
	}
	response.Success(w, bid, reqID)
}

func (h *Handler) GetDriverBids(w http.ResponseWriter, r *http.Request) {
	reqID, _ := r.Context().Value("request_id").(string)
	driverID, err := uuid.Parse(r.Header.Get("X-User-ID"))
	if err != nil {
		response.Unauthorized(w, "User not authenticated", "", reqID)
		return
	}

	bids, err := h.service.GetDriverBids(r.Context(), driverID)
	if err != nil {
		response.InternalServerError(w, "Failed to get bids", "", reqID)
		return
	}
	response.Success(w, bids, reqID)
}

func (h *Handler) GetJobBids(w http.ResponseWriter, r *http.Request) {
	reqID, _ := r.Context().Value("request_id").(string)
	jobID, err := uuid.Parse(mux.Vars(r)["job_id"])
	if err != nil {
		response.BadRequest(w, "Invalid job ID", "", reqID)
		return
	}

	bids, err := h.service.GetBidsForJob(r.Context(), jobID)
	if err != nil {
		response.InternalServerError(w, "Failed to get bids", "", reqID)
		return
	}
	response.Success(w, bids, reqID)
}

func (h *Handler) UpdateBid(w http.ResponseWriter, r *http.Request) {
	reqID, _ := r.Context().Value("request_id").(string)
	driverID, err := uuid.Parse(r.Header.Get("X-User-ID"))
	if err != nil {
		response.Unauthorized(w, "User not authenticated", "", reqID)
		return
	}
	bidID, err := uuid.Parse(mux.Vars(r)["id"])
	if err != nil {
		response.BadRequest(w, "Invalid bid ID", "", reqID)
		return
	}

	var req model.UpdateBidRequest
	if err := h.validator.DecodeAndValidate(r, &req); err != nil {
		response.BadRequest(w, "Invalid request", err.Error(), reqID)
		return
	}

	bid, err := h.service.UpdateBid(r.Context(), bidID, driverID, req)
	if err != nil {
		switch err {
		case service.ErrBidNotFound:
			response.NotFound(w, "Bid not found", "", reqID)
		case service.ErrNotBidOwner:
			response.Forbidden(w, err.Error(), "", reqID)
		case service.ErrBidNotPending:
			response.Conflict(w, err.Error(), "", reqID)
		default:
			response.InternalServerError(w, "Failed to update bid", "", reqID)
		}
		return
	}
	response.Success(w, bid, reqID)
}

func (h *Handler) WithdrawBid(w http.ResponseWriter, r *http.Request) {
	reqID, _ := r.Context().Value("request_id").(string)
	driverID, err := uuid.Parse(r.Header.Get("X-User-ID"))
	if err != nil {
		response.Unauthorized(w, "User not authenticated", "", reqID)
		return
	}
	bidID, err := uuid.Parse(mux.Vars(r)["id"])
	if err != nil {
		response.BadRequest(w, "Invalid bid ID", "", reqID)
		return
	}

	if err := h.service.WithdrawBid(r.Context(), bidID, driverID); err != nil {
		switch err {
		case service.ErrBidNotFound:
			response.NotFound(w, "Bid not found", "", reqID)
		case service.ErrNotBidOwner:
			response.Forbidden(w, err.Error(), "", reqID)
		case service.ErrBidNotPending:
			response.Conflict(w, err.Error(), "", reqID)
		default:
			response.InternalServerError(w, "Failed to withdraw bid", "", reqID)
		}
		return
	}
	response.Success(w, map[string]string{"message": "Bid withdrawn"}, reqID)
}

func (h *Handler) AcceptBid(w http.ResponseWriter, r *http.Request) {
	reqID, _ := r.Context().Value("request_id").(string)
	bidID, err := uuid.Parse(mux.Vars(r)["id"])
	if err != nil {
		response.BadRequest(w, "Invalid bid ID", "", reqID)
		return
	}

	bid, err := h.service.AcceptBid(r.Context(), bidID)
	if err != nil {
		switch err {
		case service.ErrBidNotFound:
			response.NotFound(w, "Bid not found", "", reqID)
		case service.ErrBidNotPending:
			response.Conflict(w, err.Error(), "", reqID)
		default:
			response.InternalServerError(w, "Failed to accept bid", "", reqID)
		}
		return
	}
	response.Success(w, bid, reqID)
}

func (h *Handler) RejectBid(w http.ResponseWriter, r *http.Request) {
	reqID, _ := r.Context().Value("request_id").(string)
	bidID, err := uuid.Parse(mux.Vars(r)["id"])
	if err != nil {
		response.BadRequest(w, "Invalid bid ID", "", reqID)
		return
	}

	if err := h.service.RejectBid(r.Context(), bidID); err != nil {
		switch err {
		case service.ErrBidNotFound:
			response.NotFound(w, "Bid not found", "", reqID)
		case service.ErrBidNotPending:
			response.Conflict(w, err.Error(), "", reqID)
		default:
			response.InternalServerError(w, "Failed to reject bid", "", reqID)
		}
		return
	}
	response.Success(w, map[string]string{"message": "Bid rejected"}, reqID)
}
