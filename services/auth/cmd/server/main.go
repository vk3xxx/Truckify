package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/gorilla/mux"
	"truckify/services/auth/internal/handler"
	"truckify/services/auth/internal/repository"
	"truckify/services/auth/internal/service"
	"truckify/shared/pkg/config"
	"truckify/shared/pkg/database"
	"truckify/shared/pkg/jwt"
	"truckify/shared/pkg/logger"
	"truckify/shared/pkg/middleware"
)

func main() {
	// Initialize logger
	logLevel := config.GetEnv("LOG_LEVEL", "info")
	log := logger.New("auth-service", logLevel)
	log.Info("Starting Auth Service")

	// Load configuration
	jwtSecret := config.MustGetEnv("JWT_SECRET")
	accessTokenTTL := time.Duration(config.GetEnvInt("JWT_ACCESS_TTL_MINUTES", 15)) * time.Minute
	refreshTokenTTL := time.Duration(config.GetEnvInt("JWT_REFRESH_TTL_HOURS", 168)) * time.Hour

	// Initialize database connection
	db, err := database.NewPostgresDB(database.PostgresConfig{
		Host:     config.GetEnv("DB_HOST", "localhost"),
		Port:     config.GetEnvInt("DB_PORT", 5432),
		User:     config.GetEnv("DB_USER", "truckify"),
		Password: config.GetEnv("DB_PASSWORD", "truckify_password"),
		Database: config.GetEnv("DB_NAME", "auth"),
		SSLMode:  config.GetEnv("DB_SSLMODE", "disable"),
	})
	if err != nil {
		log.Fatal("Failed to connect to database", "error", err)
	}
	defer database.ClosePostgresDB(db)
	log.Info("Connected to PostgreSQL")

	// Initialize JWT manager
	jwtManager := jwt.NewJWTManager(jwtSecret, accessTokenTTL, refreshTokenTTL)

	// Initialize WebAuthn
	rpID := config.GetEnv("WEBAUTHN_RP_ID", "localhost")
	rpOrigin := config.GetEnv("WEBAUTHN_RP_ORIGIN", "http://localhost:8000")
	webAuthn, err := webauthn.New(&webauthn.Config{
		RPDisplayName: "Truckify",
		RPID:          rpID,
		RPOrigins:     []string{rpOrigin},
	})
	if err != nil {
		log.Fatal("Failed to initialize WebAuthn", "error", err)
	}

	// Initialize repository
	repo := repository.New(db)

	// Initialize service with WebAuthn
	svc := service.NewWithWebAuthn(repo, jwtManager, webAuthn, log)

	// Initialize handler
	h := handler.New(svc, log)

	// Setup router
	router := mux.NewRouter()

	// Apply middlewares
	router.Use(middleware.RequestID)
	router.Use(middleware.Recovery(log))
	router.Use(middleware.Logger(log))
	router.Use(middleware.SecurityHeaders)

	// Register routes
	h.RegisterRoutes(router)
	h.RegisterPasskeyRoutes(router)
	h.RegisterAdminRoutes(router)

	// Wrap router with CORS (must be outermost to handle OPTIONS)
	corsHandler := middleware.CORS([]string{"http://localhost:5173", "http://localhost:3000", "*"})(router)

	// Create HTTP server
	port := config.GetEnv("PORT", "8001")
	server := &http.Server{
		Addr:         fmt.Sprintf(":%s", port),
		Handler:      corsHandler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in a goroutine
	go func() {
		log.Info("Auth Service listening", "port", port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal("Server failed to start", "error", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info("Shutting down Auth Service...")

	// Graceful shutdown with 10 second timeout
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Error("Server forced to shutdown", "error", err)
	}

	log.Info("Auth Service stopped")
}
