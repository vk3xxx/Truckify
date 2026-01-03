package main

import (
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gorilla/mux"
	"truckify/services/route/internal/handler"
	"truckify/services/route/internal/service"
	"truckify/shared/pkg/config"
	"truckify/shared/pkg/logger"
	"truckify/shared/pkg/middleware"
)

func main() {
	log := logger.New("route-service", config.GetEnv("LOG_LEVEL", "info"))
	log.Info("Starting Route Service")

	svc := service.New()
	h := handler.New(svc)

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

	port := config.GetEnv("PORT", "8009")
	server := &http.Server{Addr: fmt.Sprintf(":%s", port), Handler: corsHandler, ReadTimeout: 15 * time.Second, WriteTimeout: 15 * time.Second}

	go func() {
		log.Info("Route Service listening", "port", port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal("Server failed", "error", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Info("Shutting down")
}
