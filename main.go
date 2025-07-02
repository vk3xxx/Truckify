package main

import (
	"fmt"
	"log"
	"net/http"
)

func main() {
	log.Println("=== Truckify Application Starting ===")

	// Force the app to always listen on port 3000
	port := "3000"
	log.Printf("Server will always listen on port %s", port)

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

	// DB health check endpoint
	http.HandleFunc("/dbhealthz", dbHealthCheckHandler)

	// Start the server
	log.Printf("Starting Truckify server on 0.0.0.0:%s", port)
	log.Fatal(http.ListenAndServe("0.0.0.0:"+port, nil))
}
