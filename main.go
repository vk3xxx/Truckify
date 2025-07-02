package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
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
		w.Header().Set("Content-Type", "text/plain")
		fmt.Fprintf(w, "Hello, World! Welcome to Truckify! 🚛")
	})

	// Health check endpoint
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		log.Printf("Health check request: %s %s", r.Method, r.URL.Path)
		w.Header().Set("Content-Type", "text/plain")
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, "OK")
	})

	// Start the server
	log.Printf("Starting Truckify server on 0.0.0.0:%s", port)
	log.Fatal(http.ListenAndServe("0.0.0.0:"+port, nil))
}
