package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	_ "github.com/lib/pq"
)

type HealthStatus struct {
	HTTP     string `json:"http"`
	Database string `json:"database"`
}

// dbHealthCheckHandler checks both the HTTP server and the database server
func dbHealthCheckHandler(w http.ResponseWriter, r *http.Request) {
	status := HealthStatus{HTTP: "ok"}
	code := http.StatusOK

	// Check the database
	connStr := os.Getenv("DB_CONN")
	if connStr == "" {
		connStr = "postgres://postgres:supabase@10.0.2.2:5432/postgres?sslmode=disable&connect_timeout=2"
	}
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Printf("DB connection error: %v", err)
		status.Database = "error: " + err.Error()
		code = http.StatusInternalServerError
	} else {
		defer db.Close()
		err = db.Ping()
		if err != nil {
			log.Printf("DB ping error: %v", err)
			status.Database = "error: " + err.Error()
			code = http.StatusInternalServerError
		} else {
			status.Database = "ok"
		}
	}

	accept := r.Header.Get("Accept")
	if strings.Contains(accept, "text/html") || strings.Contains(r.URL.RawQuery, "html") {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		fmt.Fprintf(w, "<html><head><title>System Health</title><meta http-equiv='refresh' content='30'></head><body>")
		fmt.Fprintf(w, "<h2>System Health Check</h2>")
		fmt.Fprintf(w, "<p>Database checked at: <b>10.0.2.2:5432</b></p>")
		fmt.Fprintf(w, "<ul style='font-size:1.5em;'>")
		if status.HTTP == "ok" {
			fmt.Fprintf(w, "<li>HTTP Server: <span style='color:green;'>✔️</span></li>")
		} else {
			fmt.Fprintf(w, "<li>HTTP Server: <span style='color:red;'>❌</span></li>")
		}
		if status.Database == "ok" {
			fmt.Fprintf(w, "<li>Database: <span style='color:green;'>✔️</span></li>")
		} else {
			fmt.Fprintf(w, "<li>Database: <span style='color:red;'>❌</span> <span style='font-size:0.7em;'>%s</span></li>", status.Database)
		}
		fmt.Fprintf(w, "</ul>")
		fmt.Fprintf(w, "</body></html>")
		w.WriteHeader(code)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(status)
}

// In your main.go, add:
// http.HandleFunc("/dbhealthz", dbHealthCheckHandler)
