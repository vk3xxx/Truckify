package handler

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"truckify/services/job/internal/model"
	"truckify/services/job/internal/repository"
)

type mockService struct {
	job  *model.Job
	jobs []*model.Job
	err  error
}

func (m *mockService) CreateJob(shipperID uuid.UUID, req *model.CreateJobRequest) (*model.Job, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.job, nil
}

func (m *mockService) GetJob(id uuid.UUID) (*model.Job, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.job, nil
}

func (m *mockService) ListJobs(filter model.JobFilter) ([]*model.Job, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.jobs, nil
}

func (m *mockService) UpdateJob(id uuid.UUID, req *model.UpdateJobRequest) (*model.Job, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.job, nil
}

func (m *mockService) AssignDriver(jobID, driverID uuid.UUID) error {
	return m.err
}

func (m *mockService) DeleteJob(id uuid.UUID) error {
	return m.err
}

func (m *mockService) UpdateStatus(id uuid.UUID, status string) (*model.Job, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.job, nil
}

func TestJobHealth(t *testing.T) {
	h := &Handler{svc: &mockService{}, val: nil}
	req := httptest.NewRequest("GET", "/health", nil)
	w := httptest.NewRecorder()

	h.Health(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
}

func TestCreateJob_Success(t *testing.T) {
	mock := &mockService{
		job: &model.Job{
			ID:        uuid.New(),
			ShipperID: uuid.New(),
			Status:    "pending",
			Pickup:    model.Location{City: "Sydney", State: "NSW"},
			Delivery:  model.Location{City: "Melbourne", State: "VIC"},
			Price:     2500,
		},
	}
	h := &Handler{svc: mock, val: nil}

	body := `{"pickup_city":"Sydney","pickup_state":"NSW","delivery_city":"Melbourne","delivery_state":"VIC","pickup_date":"2026-01-15","delivery_date":"2026-01-16","cargo_type":"general","weight":15000,"vehicle_type":"flatbed","price":2500}`
	req := httptest.NewRequest("POST", "/jobs", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-ID", uuid.New().String())
	w := httptest.NewRecorder()

	h.CreateJob(w, req)

	if w.Code != http.StatusCreated {
		t.Errorf("expected 201, got %d: %s", w.Code, w.Body.String())
	}
}

func TestCreateJob_Unauthorized(t *testing.T) {
	h := &Handler{svc: &mockService{}, val: nil}
	req := httptest.NewRequest("POST", "/jobs", bytes.NewBufferString(`{}`))
	w := httptest.NewRecorder()

	h.CreateJob(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestGetJob_Success(t *testing.T) {
	jobID := uuid.New()
	mock := &mockService{
		job: &model.Job{ID: jobID, Status: "pending"},
	}
	h := &Handler{svc: mock, val: nil}

	req := httptest.NewRequest("GET", "/jobs/"+jobID.String(), nil)
	w := httptest.NewRecorder()

	router := mux.NewRouter()
	router.HandleFunc("/jobs/{id}", h.GetJob).Methods("GET")
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
}

func TestGetJob_NotFound(t *testing.T) {
	mock := &mockService{err: repository.ErrNotFound}
	h := &Handler{svc: mock, val: nil}

	req := httptest.NewRequest("GET", "/jobs/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()

	router := mux.NewRouter()
	router.HandleFunc("/jobs/{id}", h.GetJob).Methods("GET")
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

func TestListJobs_Success(t *testing.T) {
	mock := &mockService{
		jobs: []*model.Job{
			{ID: uuid.New(), Status: "pending", Price: 1500},
			{ID: uuid.New(), Status: "assigned", Price: 2000},
		},
	}
	h := &Handler{svc: mock, val: nil}

	req := httptest.NewRequest("GET", "/jobs?status=pending", nil)
	w := httptest.NewRecorder()

	h.ListJobs(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp["data"] == nil {
		t.Error("expected data in response")
	}
}

func TestUpdateJob_Success(t *testing.T) {
	jobID := uuid.New()
	mock := &mockService{
		job: &model.Job{ID: jobID, Status: "in_transit"},
	}
	h := &Handler{svc: mock, val: nil}

	body := `{"status":"in_transit"}`
	req := httptest.NewRequest("PUT", "/jobs/"+jobID.String(), bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router := mux.NewRouter()
	router.HandleFunc("/jobs/{id}", h.UpdateJob).Methods("PUT")
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestAssignDriver_Success(t *testing.T) {
	mock := &mockService{}
	h := &Handler{svc: mock, val: nil}

	jobID := uuid.New()
	driverID := uuid.New()
	body := `{"driver_id":"` + driverID.String() + `"}`
	req := httptest.NewRequest("POST", "/jobs/"+jobID.String()+"/assign", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router := mux.NewRouter()
	router.HandleFunc("/jobs/{id}/assign", h.AssignDriver).Methods("POST")
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestDeleteJob_Success(t *testing.T) {
	mock := &mockService{}
	h := &Handler{svc: mock, val: nil}

	jobID := uuid.New()
	req := httptest.NewRequest("DELETE", "/jobs/"+jobID.String(), nil)
	w := httptest.NewRecorder()

	router := mux.NewRouter()
	router.HandleFunc("/jobs/{id}", h.DeleteJob).Methods("DELETE")
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
}

func TestDeleteJob_NotFound(t *testing.T) {
	mock := &mockService{err: repository.ErrNotFound}
	h := &Handler{svc: mock, val: nil}

	req := httptest.NewRequest("DELETE", "/jobs/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()

	router := mux.NewRouter()
	router.HandleFunc("/jobs/{id}", h.DeleteJob).Methods("DELETE")
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

func TestGetJob_InvalidID(t *testing.T) {
	h := &Handler{svc: &mockService{}, val: nil}

	req := httptest.NewRequest("GET", "/jobs/invalid-uuid", nil)
	w := httptest.NewRecorder()

	router := mux.NewRouter()
	router.HandleFunc("/jobs/{id}", h.GetJob).Methods("GET")
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

// Ensure time import is used
var _ = time.Now
