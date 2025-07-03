package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/go-chi/chi/v5"
	_ "github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"

	"github.com/go-oauth2/oauth2/v4/errors"
	"github.com/go-oauth2/oauth2/v4/generates"
	"github.com/go-oauth2/oauth2/v4/manage"
	"github.com/go-oauth2/oauth2/v4/models"
	"github.com/go-oauth2/oauth2/v4/server"
	"github.com/go-oauth2/oauth2/v4/store"
)

// User represents a user in the system
type User struct {
	ID           int
	Email        string
	PasswordHash string
	Name         string
	CreatedAt    time.Time
}

func ensureUsersTable(db *sql.DB) error {
	query := `CREATE TABLE IF NOT EXISTS users (
		id SERIAL PRIMARY KEY,
		email VARCHAR(255) UNIQUE NOT NULL,
		password_hash VARCHAR(255) NOT NULL,
		name VARCHAR(255),
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	)`
	_, err := db.Exec(query)
	return err
}

func main() {
	dbConnStr := os.Getenv("DB_CONN")
	if dbConnStr == "" {
		dbConnStr = "postgres://postgres:1dJiynbnEPM4GTClNEW2tXxF7LtxyUfgnKpPMlQYrQrv89Nek4BLwS5U1bYCRhdk@10.0.1.9:5432/postgres?sslmode=disable&connect_timeout=2"
	}
	db, err := sql.Open("postgres", dbConnStr)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	if err := ensureUsersTable(db); err != nil {
		log.Fatalf("Failed to ensure users table: %v", err)
	}

	// OAuth2 manager and server setup
	manager := manage.NewDefaultManager()
	manager.SetAuthorizeCodeTokenCfg(manage.DefaultAuthorizeCodeTokenCfg)

	memTokenStore, err := store.NewMemoryTokenStore()
	if err != nil {
		log.Fatalf("Failed to create memory token store: %v", err)
	}
	manager.MapTokenStorage(memTokenStore)
	manager.MapAccessGenerate(generates.NewAccessGenerate())

	clientStore := store.NewClientStore()
	clientStore.Set("truckify-client", &models.Client{
		ID:     "truckify-client",
		Secret: "truckify-secret",
		Domain: "",
	})
	manager.MapClientStorage(clientStore)

	oauthServer := server.NewDefaultServer(manager)
	oauthServer.SetAllowGetAccessRequest(true)
	oauthServer.SetClientInfoHandler(server.ClientFormHandler)

	oauthServer.SetPasswordAuthorizationHandler(func(ctx context.Context, clientID, username, password string) (string, error) {
		var id int
		var hash string
		row := db.QueryRowContext(ctx, "SELECT id, password_hash FROM users WHERE email=$1", username)
		err := row.Scan(&id, &hash)
		if err != nil {
			return "", errors.ErrInvalidGrant
		}
		if bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) != nil {
			return "", errors.ErrInvalidGrant
		}
		return fmt.Sprintf("%d", id), nil
	})

	r := chi.NewRouter()

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	r.Post("/register", func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Email    string `json:"email"`
			Password string `json:"password"`
			Name     string `json:"name"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			w.Write([]byte("Invalid request"))
			return
		}
		if req.Email == "" || req.Password == "" {
			w.WriteHeader(http.StatusBadRequest)
			w.Write([]byte("Email and password required"))
			return
		}
		hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte("Error hashing password"))
			return
		}
		_, err = db.Exec("INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3)", req.Email, string(hash), req.Name)
		if err != nil {
			w.WriteHeader(http.StatusConflict)
			w.Write([]byte("User already exists or DB error"))
			return
		}
		w.WriteHeader(http.StatusCreated)
		w.Write([]byte("User registered"))
	})

	r.Post("/token", func(w http.ResponseWriter, r *http.Request) {
		oauthServer.HandleTokenRequest(w, r)
	})

	log.Println("User Service running on :4000")
	log.Fatal(http.ListenAndServe(":4000", r))
}
