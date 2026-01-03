package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gorilla/mux"
	"truckify/services/rating/internal/handler"
	"truckify/services/rating/internal/repository"
	"truckify/services/rating/internal/service"
	"truckify/shared/pkg/config"
	"truckify/shared/pkg/database"
	"truckify/shared/pkg/logger"
	"truckify/shared/pkg/middleware"
)

func main() {
	// Initialize logger
	logLevel := config.GetEnv("LOG_LEVEL", "info")
	log := logger.New("rating-service", logLevel)
	log.Info("Starting Rating Service")

	// Initialize database connection
	db, err := database.NewPostgresDB(database.PostgresConfig{
		Host:     config.GetEnv("DB_HOST", "localhost"),
		Port:     config.GetEnvInt("DB_PORT", 5432),
		User:     config.GetEnv("DB_USER", "truckify"),
		Password: config.GetEnv("DB_PASSWORD", "truckify_password"),
		Database: config.GetEnv("DB_NAME", "rating"),
		SSLMode:  config.GetEnv("DB_SSLMODE", "disable"),
	})
	if err != nil {
		log.Fatal("Failed to connect to database", "error", err)
	}
	defer database.ClosePostgresDB(db)
	log.Info("Connected to PostgreSQL")

	// Initialize repository
	repo := repository.New(db)

	// Initialize service
	svc := service.New(repo, log)

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

	// Wrap router with CORS
	corsHandler := middleware.CORS([]string{"*"})(router)

	// Create HTTP server
	port := config.GetEnv("PORT", "8013")
	server := &http.Server{
		Addr:         fmt.Sprintf(":%s", port),
		Handler:      corsHandler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in a goroutine
	go func() {
		log.Info("Rating Service listening", "port", port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal("Server failed to start", "error", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info("Shutting down Rating Service...")

	// Graceful shutdown with 10 second timeout
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Error("Server forced to shutdown", "error", err)
	}

	log.Info("Rating Service stopped")
}