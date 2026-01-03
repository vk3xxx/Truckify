package middleware

import (
	"context"
	"net/http"
	"strings"

	"truckify/shared/pkg/jwt"
	"truckify/shared/pkg/response"
)

// AuthMiddleware validates JWT tokens
type AuthMiddleware struct {
	jwtManager *jwt.JWTManager
}

// NewAuthMiddleware creates a new auth middleware
func NewAuthMiddleware(jwtManager *jwt.JWTManager) *AuthMiddleware {
	return &AuthMiddleware{
		jwtManager: jwtManager,
	}
}

// Authenticate validates the JWT token
func (m *AuthMiddleware) Authenticate(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			requestID, _ := r.Context().Value("request_id").(string)
			response.Unauthorized(w, "Missing authorization header", "", requestID)
			return
		}

		// Extract token from "Bearer <token>"
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			requestID, _ := r.Context().Value("request_id").(string)
			response.Unauthorized(w, "Invalid authorization header format", "Expected: Bearer <token>", requestID)
			return
		}

		token := parts[1]

		// Validate token
		claims, err := m.jwtManager.ValidateToken(token)
		if err != nil {
			requestID, _ := r.Context().Value("request_id").(string)
			if err == jwt.ErrExpiredToken {
				response.Unauthorized(w, "Token has expired", "", requestID)
			} else {
				response.Unauthorized(w, "Invalid token", "", requestID)
			}
			return
		}

		// Add claims to context
		ctx := context.WithValue(r.Context(), "user_id", claims.UserID)
		ctx = context.WithValue(ctx, "email", claims.Email)
		ctx = context.WithValue(ctx, "user_type", claims.UserType)

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// OptionalAuth allows requests with or without authentication
func (m *AuthMiddleware) OptionalAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			next.ServeHTTP(w, r)
			return
		}

		// Extract token
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) == 2 && parts[0] == "Bearer" {
			token := parts[1]
			claims, err := m.jwtManager.ValidateToken(token)
			if err == nil {
				ctx := context.WithValue(r.Context(), "user_id", claims.UserID)
				ctx = context.WithValue(ctx, "email", claims.Email)
				ctx = context.WithValue(ctx, "user_type", claims.UserType)
				r = r.WithContext(ctx)
			}
		}

		next.ServeHTTP(w, r)
	})
}
