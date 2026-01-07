package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestGetConfig(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/config", nil)
	w := httptest.NewRecorder()

	getConfig(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	var config SystemConfig
	if err := json.NewDecoder(w.Body).Decode(&config); err != nil {
		t.Errorf("Failed to decode response: %v", err)
	}

	if len(config.Sections) == 0 {
		t.Error("Expected config sections, got none")
	}
}

func TestSaveConfig(t *testing.T) {
	config := SystemConfig{
		Sections: []ConfigSection{
			{
				Name: "Test",
				Fields: []ConfigField{
					{Key: "test_key", Value: "test_value"},
				},
			},
		},
	}

	body, _ := json.Marshal(config)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/config", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	saveConfig(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}
}

func TestEncryptDecrypt(t *testing.T) {
	password := "test-password-123"
	plaintext := "sensitive data"

	encrypted, err := encryptValue(plaintext, password)
	if err != nil {
		t.Fatalf("Encryption failed: %v", err)
	}

	if encrypted == plaintext {
		t.Error("Encrypted value should differ from plaintext")
	}

	decrypted, err := decryptValue(encrypted, password)
	if err != nil {
		t.Fatalf("Decryption failed: %v", err)
	}

	if decrypted != plaintext {
		t.Errorf("Expected %q, got %q", plaintext, decrypted)
	}
}

func TestDecryptWithWrongPassword(t *testing.T) {
	encrypted, _ := encryptValue("secret", "correct-password")
	_, err := decryptValue(encrypted, "wrong-password")

	if err == nil {
		t.Error("Expected error with wrong password")
	}
}

func TestMaskValue(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"", ""},
		{"abc", "••••••••"},
		{"abcdefgh", "••••••••efgh"},
		{"sk_live_abc123xyz", "••••••••3xyz"},
	}

	for _, tt := range tests {
		result := maskValue(tt.input)
		if result != tt.expected {
			t.Errorf("maskValue(%q) = %q, want %q", tt.input, result, tt.expected)
		}
	}
}

func TestGetAdminPublicKey(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/admin/public-key", nil)
	w := httptest.NewRecorder()

	getAdminPublicKey(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	var response map[string]string
	if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
		t.Errorf("Failed to decode response: %v", err)
	}

	if response["publicKey"] == "" {
		t.Error("Expected public key in response")
	}
}

func TestBackupConfig(t *testing.T) {
	body := `{"password": "backup-password"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/config/backup", bytes.NewReader([]byte(body)))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	backupConfig(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	var response map[string]string
	if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
		t.Errorf("Failed to decode response: %v", err)
	}

	if response["backup"] == "" {
		t.Error("Expected backup data in response")
	}
}

func TestCORSMiddleware(t *testing.T) {
	handler := corsMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	// Test OPTIONS request
	req := httptest.NewRequest(http.MethodOptions, "/test", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Header().Get("Access-Control-Allow-Origin") != "*" {
		t.Error("Expected CORS header")
	}

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200 for OPTIONS, got %d", w.Code)
	}
}
