package middleware

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/redis/go-redis/v9"
	"truckify/shared/pkg/response"
)

// RateLimiter implements rate limiting using Redis
type RateLimiter struct {
	redis      *redis.Client
	maxRequest int
	window     time.Duration
}

// NewRateLimiter creates a new rate limiter
func NewRateLimiter(redisClient *redis.Client, maxRequests int, window time.Duration) *RateLimiter {
	return &RateLimiter{
		redis:      redisClient,
		maxRequest: maxRequests,
		window:     window,
	}
}

// Limit applies rate limiting
func (rl *RateLimiter) Limit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Get client identifier (IP address or user ID from context)
		identifier := r.RemoteAddr
		if userID, ok := r.Context().Value("user_id").(string); ok && userID != "" {
			identifier = userID
		}

		key := fmt.Sprintf("rate_limit:%s", identifier)

		ctx := context.Background()

		// Increment counter
		count, err := rl.redis.Incr(ctx, key).Result()
		if err != nil {
			// If Redis fails, allow the request (fail open)
			next.ServeHTTP(w, r)
			return
		}

		// Set expiration on first request
		if count == 1 {
			rl.redis.Expire(ctx, key, rl.window)
		}

		// Check if limit exceeded
		if count > int64(rl.maxRequest) {
			requestID, _ := r.Context().Value("request_id").(string)
			response.Error(w, http.StatusTooManyRequests, "RATE_LIMIT_EXCEEDED",
				"Too many requests", "Please try again later", requestID)
			return
		}

		// Set rate limit headers
		w.Header().Set("X-RateLimit-Limit", fmt.Sprintf("%d", rl.maxRequest))
		w.Header().Set("X-RateLimit-Remaining", fmt.Sprintf("%d", rl.maxRequest-int(count)))

		next.ServeHTTP(w, r)
	})
}
