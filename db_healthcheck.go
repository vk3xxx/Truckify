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
	HTTP        string `json:"http"`
	Database    string `json:"database"`
	UserService string `json:"user_service"`
}

// dbHealthCheckHandler checks both the HTTP server, the database server, and the user service
func dbHealthCheckHandler(w http.ResponseWriter, r *http.Request) {
	status := HealthStatus{HTTP: "ok"}
	code := http.StatusOK

	// Check the database
	connStr := os.Getenv("DB_CONN")
	if connStr == "" {
		connStr = "postgres://postgres:1dJiynbnEPM4GTClNEW2tXxF7LtxyUfgnKpPMlQYrQrv89Nek4BLwS5U1bYCRhdk@10.0.1.5:5432/postgres?sslmode=disable&connect_timeout=2"
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

	// Check the User Service
	userServiceStatus := "ok"
	resp, err := http.Get("http://10.0.1.12:4000/health")
	if err != nil || resp.StatusCode != http.StatusOK {
		userServiceStatus = "error"
		if err != nil {
			userServiceStatus += ": " + err.Error()
		} else {
			userServiceStatus += ": status code " + fmt.Sprint(resp.StatusCode)
		}
		code = http.StatusInternalServerError
	}
	status.UserService = userServiceStatus

	accept := r.Header.Get("Accept")
	if strings.Contains(accept, "text/html") || strings.Contains(r.URL.RawQuery, "html") {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		fmt.Fprintf(w, `
		<!DOCTYPE html>
		<html lang="en">
		<head>
		  <meta charset="UTF-8">
		  <meta name="viewport" content="width=device-width, initial-scale=1.0">
		  <title>System Health Dashboard</title>
		  <meta http-equiv='refresh' content='30'>
		  <style>
			body { background: #f6f8fa; font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; }
			.dashboard { max-width: 480px; margin: 40px auto; background: #fff; border-radius: 18px; box-shadow: 0 4px 24px rgba(0,0,0,0.07); padding: 32px 28px; }
			.header { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; }
			.header-icon { font-size: 2.2em; color: #22c55e; }
			.header-title { font-size: 1.7em; font-weight: 700; color: #222; letter-spacing: -1px; }
			.status-list { list-style: none; padding: 0; margin: 0; }
			.status-item { display: flex; align-items: center; justify-content: space-between; padding: 16px 0; border-bottom: 1px solid #f0f0f0; font-size: 1.1em; }
			.status-item:last-child { border-bottom: none; }
			.status-label { font-weight: 500; color: #444; display: flex; align-items: center; gap: 8px; }
			.status-badge { display: inline-block; min-width: 70px; text-align: center; padding: 4px 0; border-radius: 8px; font-weight: 600; font-size: 1em; }
			.status-ok { background: #e6f9ed; color: #22c55e; border: 1px solid #b6f2d2; }
			.status-error { background: #ffeaea; color: #ef4444; border: 1px solid #ffc7c7; }
			.status-details { font-size: 0.92em; color: #888; margin-top: 2px; }
			.footer { text-align: center; color: #aaa; font-size: 0.95em; margin-top: 28px; }
		  </style>
		</head>
		<body>
		  <div class="dashboard">
			<div class="header">
			  <span class="header-icon">🔎</span>
			  <span class="header-title">System Health</span>
			</div>
			<ul class="status-list">
			  <li class="status-item">
				<span class="status-label">HTTP Server</span>
				<span class="status-badge %s">%s</span>
			  </li>
			  <li class="status-item">
				<span class="status-label">Database <span class="status-details">(10.0.1.5:5432)</span></span>
				<span class="status-badge %s">%s</span>
			  </li>
			  <li class="status-item">
				<span class="status-label">User Service <span class="status-details">(10.0.1.12:4000)</span></span>
				<span class="status-badge %s">%s</span>
			  </li>
			</ul>
			<div class="footer">Auto-refreshes every 30 seconds &middot; Powered by Truckify</div>
		  </div>
		</body>
		</html>
		`,
			ifThenElse(status.HTTP == "ok", "status-ok", "status-error"),
			ifThenElse(status.HTTP == "ok", "Online", "Down"),
			ifThenElse(status.Database == "ok", "status-ok", "status-error"),
			ifThenElse(status.Database == "ok", "Online", "Down"),
			ifThenElse(status.UserService == "ok", "status-ok", "status-error"),
			ifThenElse(status.UserService == "ok", "Online", "Down"),
		)
		w.WriteHeader(code)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(status)
}

// In your main.go, add:
// http.HandleFunc("/dbhealthz", dbHealthCheckHandler)

// Helper for inline if-then-else
func ifThenElse(cond bool, a, b string) string {
	if cond {
		return a
	}
	return b
}
