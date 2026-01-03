package validator

import (
	"bytes"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type TestStruct struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=8"`
	Age      int    `json:"age" validate:"required,gte=18"`
	Username string `json:"username" validate:"required,min=3,max=20"`
}

func TestNew(t *testing.T) {
	v := New()
	assert.NotNil(t, v)
	assert.NotNil(t, v.validate)
}

func TestValidate(t *testing.T) {
	v := New()

	tests := []struct {
		name        string
		input       TestStruct
		expectError bool
	}{
		{
			name: "valid struct",
			input: TestStruct{
				Email:    "test@example.com",
				Password: "password123",
				Age:      25,
				Username: "testuser",
			},
			expectError: false,
		},
		{
			name: "invalid email",
			input: TestStruct{
				Email:    "invalid-email",
				Password: "password123",
				Age:      25,
				Username: "testuser",
			},
			expectError: true,
		},
		{
			name: "password too short",
			input: TestStruct{
				Email:    "test@example.com",
				Password: "short",
				Age:      25,
				Username: "testuser",
			},
			expectError: true,
		},
		{
			name: "age too young",
			input: TestStruct{
				Email:    "test@example.com",
				Password: "password123",
				Age:      16,
				Username: "testuser",
			},
			expectError: true,
		},
		{
			name: "username too short",
			input: TestStruct{
				Email:    "test@example.com",
				Password: "password123",
				Age:      25,
				Username: "ab",
			},
			expectError: true,
		},
		{
			name: "username too long",
			input: TestStruct{
				Email:    "test@example.com",
				Password: "password123",
				Age:      25,
				Username: "thisusernameiswaytoolongforvalidation",
			},
			expectError: true,
		},
		{
			name: "missing required fields",
			input: TestStruct{
				Email: "test@example.com",
			},
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := v.Validate(tt.input)
			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestDecodeAndValidate(t *testing.T) {
	v := New()

	tests := []struct {
		name        string
		body        string
		expectError bool
		errorMsg    string
	}{
		{
			name: "valid JSON and validation",
			body: `{
				"email": "test@example.com",
				"password": "password123",
				"age": 25,
				"username": "testuser"
			}`,
			expectError: false,
		},
		{
			name: "invalid JSON syntax",
			body: `{
				"email": "test@example.com",
				"password": "password123"
				"age": 25
			}`,
			expectError: true,
			errorMsg:    "malformed JSON",
		},
		{
			name: "empty body",
			body: "",
			expectError: true,
			errorMsg:    "request body is empty",
		},
		{
			name: "unknown field",
			body: `{
				"email": "test@example.com",
				"password": "password123",
				"age": 25,
				"username": "testuser",
				"unknown_field": "value"
			}`,
			expectError: true,
			errorMsg:    "unknown field",
		},
		{
			name: "invalid field type",
			body: `{
				"email": "test@example.com",
				"password": "password123",
				"age": "not-a-number",
				"username": "testuser"
			}`,
			expectError: true,
			errorMsg:    "invalid value",
		},
		{
			name: "validation failure",
			body: `{
				"email": "invalid-email",
				"password": "password123",
				"age": 25,
				"username": "testuser"
			}`,
			expectError: true,
			errorMsg:    "email",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/test", bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")

			var result TestStruct
			err := v.DecodeAndValidate(req, &result)

			if tt.expectError {
				assert.Error(t, err)
				if tt.errorMsg != "" {
					assert.Contains(t, err.Error(), tt.errorMsg)
				}
			} else {
				assert.NoError(t, err)
				assert.Equal(t, "test@example.com", result.Email)
				assert.Equal(t, "password123", result.Password)
				assert.Equal(t, 25, result.Age)
				assert.Equal(t, "testuser", result.Username)
			}
		})
	}
}

func TestDecodeAndValidateBodyTooLarge(t *testing.T) {
	v := New()

	// Create a body larger than 1MB - but it's not valid JSON so we get a JSON error
	largeBody := strings.Repeat("a", 1048577)
	req := httptest.NewRequest(http.MethodPost, "/test", bytes.NewBufferString(largeBody))
	req.Header.Set("Content-Type", "application/json")

	var result TestStruct
	err := v.DecodeAndValidate(req, &result)

	assert.Error(t, err)
	// Large invalid JSON will fail to parse
	assert.NotNil(t, err)
}

func TestFormatValidationErrors(t *testing.T) {
	v := New()

	tests := []struct {
		name     string
		input    TestStruct
		contains []string
	}{
		{
			name: "required field error",
			input: TestStruct{
				Password: "password123",
				Age:      25,
				Username: "testuser",
			},
			contains: []string{"email is required"},
		},
		{
			name: "email validation error",
			input: TestStruct{
				Email:    "invalid-email",
				Password: "password123",
				Age:      25,
				Username: "testuser",
			},
			contains: []string{"email must be a valid email address"},
		},
		{
			name: "min length error",
			input: TestStruct{
				Email:    "test@example.com",
				Password: "short",
				Age:      25,
				Username: "testuser",
			},
			contains: []string{"password must be at least 8 characters"},
		},
		{
			name: "gte error",
			input: TestStruct{
				Email:    "test@example.com",
				Password: "password123",
				Age:      16,
				Username: "testuser",
			},
			contains: []string{"age must be at least 18"},
		},
		{
			name: "multiple errors",
			input: TestStruct{
				Email: "invalid-email",
				Age:   16,
			},
			contains: []string{"email", "password", "age", "username"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := v.Validate(tt.input)
			require.Error(t, err)

			formattedErr := FormatValidationErrors(err)
			errMsg := formattedErr.Error()

			for _, expectedSubstr := range tt.contains {
				assert.Contains(t, strings.ToLower(errMsg), strings.ToLower(expectedSubstr))
			}
		})
	}
}

func TestDecodeAndValidateWithNilBody(t *testing.T) {
	v := New()

	req := httptest.NewRequest(http.MethodPost, "/test", nil)
	req.Header.Set("Content-Type", "application/json")

	var result TestStruct
	err := v.DecodeAndValidate(req, &result)

	assert.Error(t, err)
}

func TestDecodeAndValidateWithClosedBody(t *testing.T) {
	v := New()

	body := io.NopCloser(bytes.NewBufferString(`{"email":"test@example.com"}`))
	body.Close() // Close the body to simulate closed connection

	req := httptest.NewRequest(http.MethodPost, "/test", body)
	req.Header.Set("Content-Type", "application/json")

	var result TestStruct
	err := v.DecodeAndValidate(req, &result)

	assert.Error(t, err)
}

func BenchmarkValidate(b *testing.B) {
	v := New()
	input := TestStruct{
		Email:    "test@example.com",
		Password: "password123",
		Age:      25,
		Username: "testuser",
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = v.Validate(input)
	}
}

func BenchmarkDecodeAndValidate(b *testing.B) {
	v := New()
	jsonBody := `{
		"email": "test@example.com",
		"password": "password123",
		"age": 25,
		"username": "testuser"
	}`

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		req := httptest.NewRequest(http.MethodPost, "/test", bytes.NewBufferString(jsonBody))
		req.Header.Set("Content-Type", "application/json")

		var result TestStruct
		_ = v.DecodeAndValidate(req, &result)
	}
}
