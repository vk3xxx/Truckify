package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func main() {
	log.Println("=== Truckify Application Starting ===")

	// Get port from environment variable or default to 8080
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
		log.Println("No PORT environment variable found, using default: 8080")
	} else {
		log.Printf("Using PORT from environment: %s", port)
	}

	// Define the hello world handler
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		log.Printf("Received request: %s %s", r.Method, r.URL.Path)
		fmt.Fprintf(w, "Hello, World! Welcome to Truckify! 🚛")
	})

	// Health check endpoint
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		log.Printf("Health check request: %s %s", r.Method, r.URL.Path)
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, "OK")
	})

	// Create server
	server := &http.Server{
		Addr:    "0.0.0.0:" + port,
		Handler: nil, // Use default ServeMux
	}

	// Start server in a goroutine
	go func() {
		log.Printf("Starting Truckify server on 0.0.0.0:%s", port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Printf("Server error: %v", err)
			os.Exit(1)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	log.Println("Server is running. Waiting for shutdown signal...")
	<-quit

	log.Println("Shutdown signal received. Gracefully shutting down server...")

	// Create a deadline for server shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Printf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited")
}
