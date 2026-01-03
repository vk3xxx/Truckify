package main

import (
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gorilla/mux"
	"truckify/services/notification/internal/handler"
	"truckify/services/notification/internal/service"
	"truckify/services/notification/internal/websocket"
	"truckify/shared/pkg/config"
	"truckify/shared/pkg/database"
	"truckify/shared/pkg/logger"
	"truckify/shared/pkg/middleware"
)

func main() {
	log := logger.New("notification-service", config.GetEnv("LOG_LEVEL", "info"))
	log.Info("Starting Notification Service")

	db, err := database.NewPostgresDB(database.PostgresConfig{
		Host:     config.GetEnv("DB_HOST", "localhost"),
		Port:     config.GetEnvInt("DB_PORT", 5432),
		User:     config.GetEnv("DB_USER", "truckify"),
		Password: config.GetEnv("DB_PASSWORD", "truckify_password"),
		Database: config.GetEnv("DB_NAME", "notification"),
		SSLMode:  config.GetEnv("DB_SSLMODE", "disable"),
	})
	if err != nil {
		log.Fatal("Failed to connect to database", "error", err)
	}
	defer database.ClosePostgresDB(db)

	hub := websocket.NewHub()
	go hub.Run()

	svc := service.New(log, db)
	h := handler.New(svc, hub)

	router := mux.NewRouter()
	router.Use(middleware.RequestID)
	router.Use(middleware.Recovery(log))
	router.Use(middleware.Logger(log))

	router.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"healthy"}`))
	}).Methods(http.MethodGet)

	h.RegisterRoutes(router)
	corsHandler := middleware.CORS([]string{"http://localhost:5173", "*"})(router)

	port := config.GetEnv("PORT", "8014")
	server := &http.Server{Addr: fmt.Sprintf(":%s", port), Handler: corsHandler, ReadTimeout: 15 * time.Second, WriteTimeout: 15 * time.Second}

	go func() {
		log.Info("Notification Service listening", "port", port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal("Server failed", "error", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Info("Shutting down")
}
