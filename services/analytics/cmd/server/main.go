package main

import (
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gorilla/mux"
	"truckify/services/analytics/internal/handler"
	"truckify/services/analytics/internal/service"
	"truckify/shared/pkg/config"
	"truckify/shared/pkg/logger"
	"truckify/shared/pkg/middleware"
)

func main() {
	log := logger.New("analytics-service", config.GetEnv("LOG_LEVEL", "info"))
	log.Info("Starting Analytics Service")

	svc := service.New(
		config.GetEnv("AUTH_SERVICE_URL", "http://localhost:8001"),
		config.GetEnv("JOB_SERVICE_URL", "http://localhost:8006"),
		config.GetEnv("DRIVER_SERVICE_URL", "http://localhost:8004"),
		config.GetEnv("PAYMENT_SERVICE_URL", "http://localhost:8012"),
		config.GetEnv("FLEET_SERVICE_URL", "http://localhost:8005"),
		config.GetEnv("RATING_SERVICE_URL", "http://localhost:8013"),
	)
	h := handler.New(svc)

	router := mux.NewRouter()
	router.Use(middleware.RequestID)
	router.Use(middleware.Recovery(log))
	router.Use(middleware.Logger(log))

	h.RegisterRoutes(router)
	corsHandler := middleware.CORS([]string{"http://localhost:5173", "*"})(router)

	port := config.GetEnv("PORT", "8015")
	server := &http.Server{
		Addr:         fmt.Sprintf(":%s", port),
		Handler:      corsHandler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
	}

	go func() {
		log.Info("Analytics Service listening", "port", port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal("Server failed", "error", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Info("Shutting down")
}
