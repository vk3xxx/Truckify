package handler

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"truckify/services/driver/internal/model"
	"truckify/services/driver/internal/repository"
)

type mockService struct {
	driver  *model.DriverProfile
	vehicle *model.Vehicle
	drivers []*model.DriverProfile
	err     error
}

func (m *mockService) CreateDriver(userID uuid.UUID, req *model.CreateDriverRequest) (*model.DriverProfile, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.driver, nil
}

func (m *mockService) GetDriver(userID uuid.UUID) (*model.DriverProfile, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.driver, nil
}

func (m *mockService) GetDriverByID(id uuid.UUID) (*model.DriverProfile, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.driver, nil
}

func (m *mockService) UpdateDriver(userID uuid.UUID, req *model.UpdateDriverRequest) (*model.DriverProfile, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.driver, nil
}

func (m *mockService) UpdateLocation(userID uuid.UUID, req *model.UpdateLocationRequest) error {
	return m.err
}

func (m *mockService) AddVehicle(userID uuid.UUID, req *model.AddVehicleRequest) (*model.Vehicle, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.vehicle, nil
}

func (m *mockService) GetAvailableDrivers(vehicleType string, limit int) ([]*model.DriverProfile, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.drivers, nil
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

func TestCreateDriver_Success(t *testing.T) {
	mock := &mockService{
		driver: &model.DriverProfile{
			ID:            uuid.New(),
			UserID:        uuid.New(),
			LicenseNumber: "DL123456",
			Status:        "pending",
		},
	}
	h := &Handler{svc: mock, val: nil}

	body := `{"license_number":"DL123456","license_state":"NSW","license_expiry":"2027-01-01","license_class":"HC"}`
	req := httptest.NewRequest("POST", "/driver", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-ID", uuid.New().String())
	w := httptest.NewRecorder()

	h.CreateDriver(w, req)

	if w.Code != http.StatusCreated {
		t.Errorf("expected 201, got %d: %s", w.Code, w.Body.String())
	}
}

func TestCreateDriver_Unauthorized(t *testing.T) {
	h := &Handler{svc: &mockService{}, val: nil}
	req := httptest.NewRequest("POST", "/driver", bytes.NewBufferString(`{}`))
	w := httptest.NewRecorder()

	h.CreateDriver(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestGetDriver_Success(t *testing.T) {
	mock := &mockService{
		driver: &model.DriverProfile{ID: uuid.New(), LicenseNumber: "DL123456"},
	}
	h := &Handler{svc: mock, val: nil}

	req := httptest.NewRequest("GET", "/driver", nil)
	req.Header.Set("X-User-ID", uuid.New().String())
	w := httptest.NewRecorder()

	h.GetDriver(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
}

func TestGetDriver_NotFound(t *testing.T) {
	mock := &mockService{err: repository.ErrNotFound}
	h := &Handler{svc: mock, val: nil}

	req := httptest.NewRequest("GET", "/driver", nil)
	req.Header.Set("X-User-ID", uuid.New().String())
	w := httptest.NewRecorder()

	h.GetDriver(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

func TestGetDriverByID_Success(t *testing.T) {
	driverID := uuid.New()
	mock := &mockService{driver: &model.DriverProfile{ID: driverID}}
	h := &Handler{svc: mock, val: nil}

	req := httptest.NewRequest("GET", "/driver/"+driverID.String(), nil)
	w := httptest.NewRecorder()

	router := mux.NewRouter()
	router.HandleFunc("/driver/{id}", h.GetDriverByID).Methods("GET")
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
}

func TestUpdateDriver_Success(t *testing.T) {
	mock := &mockService{driver: &model.DriverProfile{ID: uuid.New()}}
	h := &Handler{svc: mock, val: nil}

	body := `{"license_number":"DL999"}`
	req := httptest.NewRequest("PUT", "/driver", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-ID", uuid.New().String())
	w := httptest.NewRecorder()

	h.UpdateDriver(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
}

func TestUpdateLocation_Success(t *testing.T) {
	h := &Handler{svc: &mockService{}, val: nil}

	body := `{"lat":-33.8688,"lng":151.2093}`
	req := httptest.NewRequest("PUT", "/driver/location", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-ID", uuid.New().String())
	w := httptest.NewRecorder()

	h.UpdateLocation(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
}

func TestAddVehicle_Success(t *testing.T) {
	mock := &mockService{vehicle: &model.Vehicle{ID: uuid.New(), Type: "flatbed"}}
	h := &Handler{svc: mock, val: nil}

	body := `{"type":"flatbed","make":"Kenworth","model":"T680","year":2022,"plate":"ABC123","capacity":25000,"rego_expiry":"2027-01-01","insurance_expiry":"2027-01-01"}`
	req := httptest.NewRequest("POST", "/driver/vehicle", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-ID", uuid.New().String())
	w := httptest.NewRecorder()

	h.AddVehicle(w, req)

	if w.Code != http.StatusCreated {
		t.Errorf("expected 201, got %d: %s", w.Code, w.Body.String())
	}
}

func TestGetAvailableDrivers_Success(t *testing.T) {
	mock := &mockService{
		drivers: []*model.DriverProfile{{ID: uuid.New()}, {ID: uuid.New()}},
	}
	h := &Handler{svc: mock, val: nil}

	req := httptest.NewRequest("GET", "/drivers/available?type=flatbed", nil)
	w := httptest.NewRecorder()

	h.GetAvailableDrivers(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp["data"] == nil {
		t.Error("expected data in response")
	}
}
