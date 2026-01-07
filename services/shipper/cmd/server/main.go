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
	"truckify/services/shipper/internal/handler"
	"truckify/services/shipper/internal/repository"
	"truckify/services/shipper/internal/service"
	"truckify/shared/pkg/config"
	"truckify/shared/pkg/database"
	"truckify/shared/pkg/logger"
	"truckify/shared/pkg/middleware"
)

func main() {
	log := logger.New("shipper-service", config.GetEnv("LOG_LEVEL", "info"))
	log.Info("Starting Shipper Service")

	db, err := database.NewPostgresDB(database.PostgresConfig{
		Host:     config.GetEnv("DB_HOST", "localhost"),
		Port:     config.GetEnvInt("DB_PORT", 5432),
		User:     config.GetEnv("DB_USER", "truckify"),
		Password: config.GetEnv("DB_PASSWORD", "truckify_password"),
		Database: config.GetEnv("DB_NAME", "shipper"),
		SSLMode:  config.GetEnv("DB_SSLMODE", "disable"),
	})
	if err != nil {
		log.Fatal("Failed to connect to database", "error", err)
	}
	defer database.ClosePostgresDB(db)
	log.Info("Connected to PostgreSQL")

	repo := repository.New(db)
	svc := service.New(repo, log)
	h := handler.New(svc, log)

	router := mux.NewRouter()
	router.Use(middleware.RequestID)
	router.Use(middleware.Recovery(log))
	router.Use(middleware.Logger(log))
	router.Use(middleware.SecurityHeaders)

	h.RegisterRoutes(router)

	corsHandler := middleware.CORS([]string{"http://localhost:5173", "http://localhost:3000", "*"})(router)

	port := config.GetEnv("PORT", "8003")
	server := &http.Server{
		Addr:         fmt.Sprintf(":%s", port),
		Handler:      corsHandler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Info("Shipper Service listening", "port", port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal("Server failed to start", "error", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info("Shutting down Shipper Service...")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Error("Server forced to shutdown", "error", err)
	}
	log.Info("Shipper Service stopped")
}
