package service

import (
	"testing"
	"time"
)

func TestGetSeasonalFactor(t *testing.T) {
	tests := []struct {
		month    time.Month
		expected float64
	}{
		{time.November, 1.25},
		{time.December, 1.25},
		{time.October, 1.15},
		{time.April, 1.10},
		{time.May, 1.10},
		{time.January, 0.90},
		{time.February, 0.90},
		{time.June, 1.0},
		{time.July, 1.0},
	}

	for _, tt := range tests {
		date := time.Date(2026, tt.month, 15, 0, 0, 0, 0, time.UTC)
		result := getSeasonalFactor(date)
		if result != tt.expected {
			t.Errorf("getSeasonalFactor(%v) = %v, want %v", tt.month, result, tt.expected)
		}
	}
}

func TestParseRoute(t *testing.T) {
	tests := []struct {
		route       string
		wantOrigin  string
		wantDest    string
	}{
		{"Sydney→Melbourne", "Sydney", "Melbourne"},
		{"Brisbane→Perth", "Brisbane", "Perth"},
		{"SingleCity", "SingleCity", ""},
	}

	for _, tt := range tests {
		origin, dest := parseRoute(tt.route)
		if origin != tt.wantOrigin || dest != tt.wantDest {
			t.Errorf("parseRoute(%q) = (%q, %q), want (%q, %q)", 
				tt.route, origin, dest, tt.wantOrigin, tt.wantDest)
		}
	}
}

func TestPricingFactors(t *testing.T) {
	// Test that pricing multiplier stays within bounds
	// by checking the seasonal factor bounds
	for month := time.January; month <= time.December; month++ {
		date := time.Date(2026, month, 15, 0, 0, 0, 0, time.UTC)
		factor := getSeasonalFactor(date)
		if factor < 0.8 || factor > 1.5 {
			t.Errorf("Seasonal factor for %v = %v, should be between 0.8 and 1.5", month, factor)
		}
	}
}
