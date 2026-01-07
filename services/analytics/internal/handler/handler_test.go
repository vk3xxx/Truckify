package handler

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHealth(t *testing.T) {
	h := &Handler{}
	req := httptest.NewRequest("GET", "/health", nil)
	w := httptest.NewRecorder()

	h.Health(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	
	data := resp["data"].(map[string]interface{})
	if data["status"] != "healthy" {
		t.Errorf("expected healthy status")
	}
	if data["service"] != "analytics-service" {
		t.Errorf("expected analytics-service")
	}
}

func TestGetPricingRecommendation_MissingParams(t *testing.T) {
	h := &Handler{}
	
	// Missing origin and destination
	req := httptest.NewRequest("GET", "/analytics/pricing/recommend", nil)
	w := httptest.NewRecorder()

	h.GetPricingRecommendation(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestGetPricingRecommendation_MissingDestination(t *testing.T) {
	h := &Handler{}
	
	req := httptest.NewRequest("GET", "/analytics/pricing/recommend?origin=Sydney", nil)
	w := httptest.NewRecorder()

	h.GetPricingRecommendation(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}
