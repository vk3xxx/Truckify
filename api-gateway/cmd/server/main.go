package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"truckify/api-gateway/internal/config"
	"truckify/api-gateway/internal/middleware"
	"truckify/api-gateway/internal/router"
	"truckify/shared/pkg/database"
	"truckify/shared/pkg/jwt"
	"truckify/shared/pkg/logger"
	sharedMiddleware "truckify/shared/pkg/middleware"
)

func main() {
	// Load configuration
	cfg := config.Load()

	// Initialize logger
	log := logger.New("api-gateway", cfg.LogLevel)
	log.Info("Starting API Gateway", "port", cfg.Port)

	// Initialize Redis for rate limiting and caching
	redisClient, err := database.NewRedisClient(database.RedisConfig{
		Host:     cfg.RedisHost,
		Port:     cfg.RedisPort,
		Password: cfg.RedisPassword,
		DB:       0,
	})
	if err != nil {
		log.Fatal("Failed to connect to Redis", "error", err)
	}
	defer database.CloseRedisClient(redisClient)
	log.Info("Connected to Redis")

	// Initialize JWT manager
	jwtManager := jwt.NewJWTManager(
		cfg.JWTSecret,
		15*time.Minute, // Access token TTL
		7*24*time.Hour, // Refresh token TTL
	)

	// Initialize middlewares
	authMiddleware := middleware.NewAuthMiddleware(jwtManager)
	rateLimiter := sharedMiddleware.NewRateLimiter(redisClient, cfg.RateLimitRequests, cfg.RateLimitWindow)

	// Setup router
	r := router.NewRouter(log, authMiddleware, rateLimiter, cfg.AllowedOrigins)
	handler := r.Setup()

	// Create HTTP server
	server := &http.Server{
		Addr:         fmt.Sprintf(":%s", cfg.Port),
		Handler:      handler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in a goroutine
	go func() {
		log.Info("API Gateway listening", "address", server.Addr)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal("Server failed to start", "error", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info("Shutting down API Gateway...")

	// Graceful shutdown with 10 second timeout
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Error("Server forced to shutdown", "error", err)
	}

	log.Info("API Gateway stopped")
}
