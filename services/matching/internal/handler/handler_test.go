package handler

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"truckify/services/matching/internal/model"
	"truckify/services/matching/internal/repository"
)

type mockService struct {
	matchResp *model.MatchResponse
	matches   []*model.Match
	err       error
}

func (m *mockService) FindMatches(req *model.MatchRequest) (*model.MatchResponse, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.matchResp, nil
}

func (m *mockService) GetMatchesForJob(jobID uuid.UUID) ([]*model.Match, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.matches, nil
}

func (m *mockService) GetPendingMatches(driverID uuid.UUID) ([]*model.Match, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.matches, nil
}

func (m *mockService) AcceptMatch(matchID uuid.UUID) error {
	return m.err
}

func (m *mockService) RejectMatch(matchID uuid.UUID) error {
	return m.err
}

func TestHealth(t *testing.T) {
	h := &Handler{svc: &mockService{}, val: nil}
	req := httptest.NewRequest("GET", "/health", nil)
	w := httptest.NewRecorder()

	h.Health(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
}

func TestFindMatches_Success(t *testing.T) {
	jobID := uuid.New()
	mock := &mockService{
		matchResp: &model.MatchResponse{
			JobID: jobID,
			Candidates: []model.DriverCandidate{
				{DriverID: uuid.New(), Rating: 4.5, Distance: 15.5, Score: 85.0},
				{DriverID: uuid.New(), Rating: 4.2, Distance: 25.0, Score: 72.0},
			},
		},
	}
	h := &Handler{svc: mock, val: nil}

	body := `{"job_id":"` + jobID.String() + `","vehicle_type":"flatbed","pickup_lat":-37.8136,"pickup_lng":144.9631}`
	req := httptest.NewRequest("POST", "/match", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	h.FindMatches(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp["data"] == nil {
		t.Error("expected data in response")
	}
}

func TestGetMatchesForJob_Success(t *testing.T) {
	jobID := uuid.New()
	mock := &mockService{
		matches: []*model.Match{
			{ID: uuid.New(), JobID: jobID, DriverID: uuid.New(), Score: 85, Status: "pending"},
		},
	}
	h := &Handler{svc: mock, val: nil}

	req := httptest.NewRequest("GET", "/matches/job/"+jobID.String(), nil)
	w := httptest.NewRecorder()

	router := mux.NewRouter()
	router.HandleFunc("/matches/job/{jobId}", h.GetMatchesForJob).Methods("GET")
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
}

func TestGetPendingMatches_Success(t *testing.T) {
	driverID := uuid.New()
	mock := &mockService{
		matches: []*model.Match{
			{ID: uuid.New(), JobID: uuid.New(), DriverID: driverID, Score: 80, Status: "pending"},
		},
	}
	h := &Handler{svc: mock, val: nil}

	req := httptest.NewRequest("GET", "/matches/pending", nil)
	req.Header.Set("X-User-ID", driverID.String())
	w := httptest.NewRecorder()

	h.GetPendingMatches(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
}

func TestGetPendingMatches_Unauthorized(t *testing.T) {
	h := &Handler{svc: &mockService{}, val: nil}
	req := httptest.NewRequest("GET", "/matches/pending", nil)
	w := httptest.NewRecorder()

	h.GetPendingMatches(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestAcceptMatch_Success(t *testing.T) {
	mock := &mockService{}
	h := &Handler{svc: mock, val: nil}

	matchID := uuid.New()
	req := httptest.NewRequest("POST", "/matches/"+matchID.String()+"/accept", nil)
	w := httptest.NewRecorder()

	router := mux.NewRouter()
	router.HandleFunc("/matches/{id}/accept", h.AcceptMatch).Methods("POST")
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
}

func TestAcceptMatch_NotFound(t *testing.T) {
	mock := &mockService{err: repository.ErrNotFound}
	h := &Handler{svc: mock, val: nil}

	req := httptest.NewRequest("POST", "/matches/"+uuid.New().String()+"/accept", nil)
	w := httptest.NewRecorder()

	router := mux.NewRouter()
	router.HandleFunc("/matches/{id}/accept", h.AcceptMatch).Methods("POST")
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

func TestRejectMatch_Success(t *testing.T) {
	mock := &mockService{}
	h := &Handler{svc: mock, val: nil}

	matchID := uuid.New()
	req := httptest.NewRequest("POST", "/matches/"+matchID.String()+"/reject", nil)
	w := httptest.NewRecorder()

	router := mux.NewRouter()
	router.HandleFunc("/matches/{id}/reject", h.RejectMatch).Methods("POST")
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
}

func TestFindMatches_InvalidJSON(t *testing.T) {
	h := &Handler{svc: &mockService{}, val: nil}

	req := httptest.NewRequest("POST", "/match", bytes.NewBufferString(`{invalid`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	h.FindMatches(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}
