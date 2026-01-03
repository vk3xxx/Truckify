package main

import (
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gorilla/mux"
	"truckify/services/fleet/internal/handler"
	"truckify/services/fleet/internal/repository"
	"truckify/services/fleet/internal/service"
	"truckify/shared/pkg/config"
	"truckify/shared/pkg/database"
	"truckify/shared/pkg/logger"
	"truckify/shared/pkg/middleware"
)

func main() {
	log := logger.New("fleet-service", config.GetEnv("LOG_LEVEL", "info"))
	log.Info("Starting Fleet Service")

	db, err := database.NewPostgresDB(database.PostgresConfig{
		Host:     config.GetEnv("DB_HOST", "localhost"),
		Port:     config.GetEnvInt("DB_PORT", 5432),
		User:     config.GetEnv("DB_USER", "truckify"),
		Password: config.GetEnv("DB_PASSWORD", "truckify_password"),
		Database: config.GetEnv("DB_NAME", "fleet"),
		SSLMode:  config.GetEnv("DB_SSLMODE", "disable"),
	})
	if err != nil {
		log.Fatal("Failed to connect to database", "error", err)
	}
	defer database.ClosePostgresDB(db)

	repo := repository.New(db)
	svc := service.New(repo)
	h := handler.New(svc)

	router := mux.NewRouter()
	router.Use(middleware.RequestID)
	router.Use(middleware.Recovery(log))
	router.Use(middleware.Logger(log))

	h.RegisterRoutes(router)
	corsHandler := middleware.CORS([]string{"http://localhost:5173", "*"})(router)

	port := config.GetEnv("PORT", "8005")
	server := &http.Server{
		Addr:         fmt.Sprintf(":%s", port),
		Handler:      corsHandler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
	}

	go func() {
		log.Info("Fleet Service listening", "port", port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal("Server failed", "error", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Info("Shutting down")
}
