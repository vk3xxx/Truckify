package jwt

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewJWTManager(t *testing.T) {
	secretKey := "test-secret-key"
	accessTTL := 15 * time.Minute
	refreshTTL := 7 * 24 * time.Hour

	manager := NewJWTManager(secretKey, accessTTL, refreshTTL)

	assert.NotNil(t, manager)
	assert.Equal(t, secretKey, manager.secretKey)
	assert.Equal(t, accessTTL, manager.accessTokenTTL)
	assert.Equal(t, refreshTTL, manager.refreshTokenTTL)
}

func TestGenerateAccessToken(t *testing.T) {
	manager := NewJWTManager("test-secret", 15*time.Minute, 7*24*time.Hour)

	tests := []struct {
		name     string
		userID   string
		email    string
		userType string
	}{
		{
			name:     "valid token generation",
			userID:   "123e4567-e89b-12d3-a456-426614174000",
			email:    "test@example.com",
			userType: "driver",
		},
		{
			name:     "shipper user type",
			userID:   "223e4567-e89b-12d3-a456-426614174001",
			email:    "shipper@example.com",
			userType: "shipper",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			token, err := manager.GenerateAccessToken(tt.userID, tt.email, tt.userType)
			require.NoError(t, err)
			assert.NotEmpty(t, token)

			// Validate the generated token
			claims, err := manager.ValidateToken(token)
			require.NoError(t, err)
			assert.Equal(t, tt.userID, claims.UserID)
			assert.Equal(t, tt.email, claims.Email)
			assert.Equal(t, tt.userType, claims.UserType)
		})
	}
}

func TestGenerateTokenPair(t *testing.T) {
	manager := NewJWTManager("test-secret", 15*time.Minute, 7*24*time.Hour)

	userID := "123e4567-e89b-12d3-a456-426614174000"
	email := "test@example.com"
	userType := "driver"

	tokenPair, err := manager.GenerateTokenPair(userID, email, userType)
	require.NoError(t, err)
	assert.NotEmpty(t, tokenPair.AccessToken)
	assert.NotEmpty(t, tokenPair.RefreshToken)
	assert.Equal(t, int64(900), tokenPair.ExpiresIn) // 15 minutes in seconds

	// Validate access token
	accessClaims, err := manager.ValidateToken(tokenPair.AccessToken)
	require.NoError(t, err)
	assert.Equal(t, userID, accessClaims.UserID)

	// Validate refresh token
	refreshClaims, err := manager.ValidateToken(tokenPair.RefreshToken)
	require.NoError(t, err)
	assert.Equal(t, userID, refreshClaims.UserID)
}

func TestValidateToken(t *testing.T) {
	manager := NewJWTManager("test-secret", 15*time.Minute, 7*24*time.Hour)

	userID := "123e4567-e89b-12d3-a456-426614174000"
	email := "test@example.com"
	userType := "driver"

	tests := []struct {
		name        string
		setupToken  func() string
		expectError bool
		errorType   error
	}{
		{
			name: "valid token",
			setupToken: func() string {
				token, _ := manager.GenerateAccessToken(userID, email, userType)
				return token
			},
			expectError: false,
		},
		{
			name: "invalid token format",
			setupToken: func() string {
				return "invalid.token.format"
			},
			expectError: true,
			errorType:   ErrInvalidToken,
		},
		{
			name: "expired token",
			setupToken: func() string {
				expiredManager := NewJWTManager("test-secret", -1*time.Hour, 7*24*time.Hour)
				token, _ := expiredManager.GenerateAccessToken(userID, email, userType)
				return token
			},
			expectError: true,
			errorType:   ErrExpiredToken,
		},
		{
			name: "wrong secret key",
			setupToken: func() string {
				wrongManager := NewJWTManager("wrong-secret", 15*time.Minute, 7*24*time.Hour)
				token, _ := wrongManager.GenerateAccessToken(userID, email, userType)
				return token
			},
			expectError: true,
			errorType:   ErrInvalidToken,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			token := tt.setupToken()
			claims, err := manager.ValidateToken(token)

			if tt.expectError {
				assert.Error(t, err)
				assert.Nil(t, claims)
				if tt.errorType != nil {
					assert.ErrorIs(t, err, tt.errorType)
				}
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, claims)
				assert.Equal(t, userID, claims.UserID)
				assert.Equal(t, email, claims.Email)
				assert.Equal(t, userType, claims.UserType)
			}
		})
	}
}

func TestRefreshAccessToken(t *testing.T) {
	manager := NewJWTManager("test-secret", 15*time.Minute, 7*24*time.Hour)

	userID := "123e4567-e89b-12d3-a456-426614174000"
	email := "test@example.com"
	userType := "driver"

	// Generate initial token pair
	tokenPair, err := manager.GenerateTokenPair(userID, email, userType)
	require.NoError(t, err)

	// Wait a moment to ensure new token has different timestamp
	time.Sleep(1 * time.Second)

	// Refresh access token using refresh token
	newAccessToken, err := manager.RefreshAccessToken(tokenPair.RefreshToken)
	require.NoError(t, err)
	assert.NotEmpty(t, newAccessToken)
	assert.NotEqual(t, tokenPair.AccessToken, newAccessToken)

	// Validate new access token
	claims, err := manager.ValidateToken(newAccessToken)
	require.NoError(t, err)
	assert.Equal(t, userID, claims.UserID)
	assert.Equal(t, email, claims.Email)
	assert.Equal(t, userType, claims.UserType)
}

func TestRefreshAccessTokenWithInvalidRefreshToken(t *testing.T) {
	manager := NewJWTManager("test-secret", 15*time.Minute, 7*24*time.Hour)

	newAccessToken, err := manager.RefreshAccessToken("invalid.refresh.token")
	assert.Error(t, err)
	assert.Empty(t, newAccessToken)
}

func TestGenerateRefreshToken(t *testing.T) {
	manager := NewJWTManager("test-secret", 15*time.Minute, 7*24*time.Hour)

	userID := "123e4567-e89b-12d3-a456-426614174000"
	email := "test@example.com"
	userType := "driver"

	token, err := manager.GenerateRefreshToken(userID, email, userType)
	require.NoError(t, err)
	assert.NotEmpty(t, token)

	// Validate refresh token
	claims, err := manager.ValidateToken(token)
	require.NoError(t, err)
	assert.Equal(t, userID, claims.UserID)
	assert.Equal(t, email, claims.Email)
	assert.Equal(t, userType, claims.UserType)

	// Check expiry time (should be 7 days)
	expectedExpiry := time.Now().Add(7 * 24 * time.Hour)
	actualExpiry := claims.ExpiresAt.Time
	assert.WithinDuration(t, expectedExpiry, actualExpiry, 5*time.Second)
}

func TestTokenExpiry(t *testing.T) {
	// Create manager with very short TTL for testing
	manager := NewJWTManager("test-secret", 1*time.Millisecond, 1*time.Millisecond)

	userID := "123e4567-e89b-12d3-a456-426614174000"
	email := "test@example.com"
	userType := "driver"

	token, err := manager.GenerateAccessToken(userID, email, userType)
	require.NoError(t, err)

	// Wait for token to expire
	time.Sleep(10 * time.Millisecond)

	// Try to validate expired token
	claims, err := manager.ValidateToken(token)
	assert.Error(t, err)
	assert.Nil(t, claims)
	assert.ErrorIs(t, err, ErrExpiredToken)
}
