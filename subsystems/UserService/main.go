package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/go-chi/chi/v5"
	_ "github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"

	"github.com/go-oauth2/oauth2/v4/errors"
	"github.com/go-oauth2/oauth2/v4/generates"
	"github.com/go-oauth2/oauth2/v4/manage"
	"github.com/go-oauth2/oauth2/v4/models"
	"github.com/go-oauth2/oauth2/v4/server"
	"github.com/go-oauth2/oauth2/v4/store"
	"github.com/go-webauthn/webauthn/protocol"
	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/google/uuid"
)

// User struct updated for WebAuthn
type User struct {
	ID          string
	Name        string
	DisplayName string
	Icon        string
	Credentials []webauthn.Credential // must be loaded from DB before WebAuthn calls
}

// WebAuthn user and credential storage (in-memory for now)
var webAuthnInstance *webauthn.WebAuthn
var userStore = map[string]*User{}
var credentialStore = map[string][]webauthn.Credential{}

// Implement webauthn.User interface for User
func (u *User) WebAuthnID() []byte                         { return []byte(u.ID) }
func (u *User) WebAuthnName() string                       { return u.Name }
func (u *User) WebAuthnDisplayName() string                { return u.DisplayName }
func (u *User) WebAuthnIcon() string                       { return u.Icon }
func (u *User) WebAuthnCredentials() []webauthn.Credential { return u.Credentials }

func ensureUsersTable(db *sql.DB) error {
	query := `CREATE TABLE IF NOT EXISTS users (
		id VARCHAR(255) PRIMARY KEY,
		email VARCHAR(255) UNIQUE NOT NULL,
		password_hash VARCHAR(255) NOT NULL,
		name VARCHAR(255),
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	)`
	_, err := db.Exec(query)
	return err
}

// Add DB migration for webauthn_credentials table
func ensureWebauthnCredentialsTable(db *sql.DB) error {
	query := `CREATE TABLE IF NOT EXISTS webauthn_credentials (
		id SERIAL PRIMARY KEY,
		user_id VARCHAR(255) NOT NULL,
		credential_id BYTEA NOT NULL,
		public_key BYTEA NOT NULL,
		sign_count BIGINT NOT NULL,
		transports TEXT,
		attestation_type TEXT,
		fmt TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(user_id, credential_id)
	)`
	_, err := db.Exec(query)
	return err
}

// Auth middleware to extract user ID from Bearer token using go-oauth2
func authMiddleware(oauthServer *server.Server) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			auth := r.Header.Get("Authorization")
			if !strings.HasPrefix(auth, "Bearer ") {
				w.WriteHeader(http.StatusUnauthorized)
				w.Write([]byte("Missing or invalid Authorization header"))
				return
			}
			token := strings.TrimPrefix(auth, "Bearer ")
			ti, err := oauthServer.Manager.LoadAccessToken(r.Context(), token)
			if err != nil || ti == nil || ti.GetUserID() == "" {
				w.WriteHeader(http.StatusUnauthorized)
				w.Write([]byte("Invalid or expired token"))
				return
			}
			ctx := context.WithValue(r.Context(), "userID", ti.GetUserID())
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// Simple admin check: user with ID 1 is admin
func isAdmin(r *http.Request) bool {
	return r.Context().Value("userID") == "1"
}

// DB-backed credential store
func loadCredentialsForUser(db *sql.DB, userID string) ([]webauthn.Credential, error) {
	var err error
	var rows *sql.Rows
	rows, err = db.Query(`SELECT credential_id, public_key, attestation_type, transports, sign_count, aaguid, attachment, clone_warning FROM webauthn_credentials WHERE user_id=$1`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var creds []webauthn.Credential
	for rows.Next() {
		var cred webauthn.Credential
		var transports string
		var aaguid []byte
		var attachment string
		var cloneWarning bool
		err = rows.Scan(&cred.ID, &cred.PublicKey, &cred.AttestationType, &transports, &cred.Authenticator.SignCount, &aaguid, &attachment, &cloneWarning)
		if err != nil {
			return nil, err
		}
		// Parse transports
		for _, t := range strings.Split(transports, ",") {
			if t != "" {
				cred.Transport = append(cred.Transport, protocol.AuthenticatorTransport(t))
			}
		}
		cred.Authenticator.AAGUID = aaguid
		cred.Authenticator.Attachment = protocol.AuthenticatorAttachment(attachment)
		cred.Authenticator.CloneWarning = cloneWarning
		creds = append(creds, cred)
	}
	return creds, nil
}

func storeCredentialForUser(db *sql.DB, userID string, cred webauthn.Credential) error {
	var err error
	var transports []string
	for _, t := range cred.Transport {
		transports = append(transports, string(t))
	}
	_, err = db.Exec(
		`INSERT INTO webauthn_credentials (user_id, credential_id, public_key, attestation_type, transports, sign_count, aaguid, attachment, clone_warning) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		 ON CONFLICT (user_id, credential_id) DO UPDATE SET public_key=EXCLUDED.public_key, attestation_type=EXCLUDED.attestation_type, transports=EXCLUDED.transports, sign_count=EXCLUDED.sign_count, aaguid=EXCLUDED.aaguid, attachment=EXCLUDED.attachment, clone_warning=EXCLUDED.clone_warning`,
		userID, cred.ID, cred.PublicKey, cred.AttestationType, strings.Join(transports, ","), cred.Authenticator.SignCount, cred.Authenticator.AAGUID, string(cred.Authenticator.Attachment), cred.Authenticator.CloneWarning,
	)
	return err
}

func main() {
	var err error
	dbConnStr := os.Getenv("DB_CONN")
	if dbConnStr == "" {
		dbConnStr = "postgres://postgres:1dJiynbnEPM4GTClNEW2tXxF7LtxyUfgnKpPMlQYrQrv89Nek4BLwS5U1bYCRhdk@10.0.1.5:5432/postgres?sslmode=disable&connect_timeout=2"
	}
	db, err := sql.Open("postgres", dbConnStr)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	if err = ensureUsersTable(db); err != nil {
		log.Fatalf("Failed to ensure users table: %v", err)
	}
	if err = ensureWebauthnCredentialsTable(db); err != nil {
		log.Fatalf("Failed to ensure webauthn_credentials table: %v", err)
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
		var id string
		var hash string
		row := db.QueryRowContext(ctx, "SELECT id, password_hash FROM users WHERE email=$1", username)
		err := row.Scan(&id, &hash)
		if err != nil {
			return "", errors.ErrInvalidGrant
		}
		if bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) != nil {
			return "", errors.ErrInvalidGrant
		}
		return id, nil
	})

	// Initialize WebAuthn
	webAuthnInstance, err = webauthn.New(&webauthn.Config{
		RPDisplayName: "Truckify",                        // Display Name for your site
		RPID:          "localhost",                       // Change to your domain in production
		RPOrigins:     []string{"http://localhost:3000"}, // Change to your frontend origin
	})
	if err != nil {
		log.Fatalf("Failed to initialize WebAuthn: %v", err)
	}

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
		id := uuid.NewString()
		_, err = db.Exec("INSERT INTO users (id, email, password_hash, name) VALUES ($1, $2, $3, $4)", id, req.Email, string(hash), req.Name)
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

	// Profile endpoints
	r.Group(func(r chi.Router) {
		r.Use(authMiddleware(oauthServer))

		r.Get("/profile", func(w http.ResponseWriter, r *http.Request) {
			userID := r.Context().Value("userID").(string)
			var user User
			err := db.QueryRow("SELECT id, email, name, created_at FROM users WHERE id=$1", userID).Scan(&user.ID, &user.Name, &user.DisplayName, &user.Icon)
			if err != nil {
				w.WriteHeader(http.StatusNotFound)
				w.Write([]byte("User not found"))
				return
			}
			user.Credentials, _ = loadCredentialsForUser(db, userID)
			json.NewEncoder(w).Encode(user)
		})

		r.Put("/profile", func(w http.ResponseWriter, r *http.Request) {
			userID := r.Context().Value("userID").(string)
			var req struct {
				Name string `json:"name"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				w.WriteHeader(http.StatusBadRequest)
				w.Write([]byte("Invalid request"))
				return
			}
			_, err := db.Exec("UPDATE users SET name=$1 WHERE id=$2", req.Name, userID)
			if err != nil {
				w.WriteHeader(http.StatusInternalServerError)
				w.Write([]byte("DB error"))
				return
			}
			w.WriteHeader(http.StatusOK)
			w.Write([]byte("Profile updated"))
		})

		// Admin endpoints
		r.Route("/users", func(r chi.Router) {
			r.Use(func(next http.Handler) http.Handler {
				return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					if !isAdmin(r) {
						w.WriteHeader(http.StatusForbidden)
						w.Write([]byte("Admin only"))
						return
					}
					next.ServeHTTP(w, r)
				})
			})

			r.Get("/", func(w http.ResponseWriter, r *http.Request) {
				rows, err := db.Query("SELECT id, email, name, created_at FROM users")
				if err != nil {
					w.WriteHeader(http.StatusInternalServerError)
					w.Write([]byte("DB error"))
					return
				}
				defer rows.Close()
				var users []User
				for rows.Next() {
					var u User
					rows.Scan(&u.ID, &u.Name, &u.DisplayName, &u.Icon)
					u.Credentials, _ = loadCredentialsForUser(db, u.ID)
					users = append(users, u)
				}
				json.NewEncoder(w).Encode(users)
			})

			r.Get("/{id}", func(w http.ResponseWriter, r *http.Request) {
				id := chi.URLParam(r, "id")
				var user User
				err := db.QueryRow("SELECT id, email, name, created_at FROM users WHERE id=$1", id).Scan(&user.ID, &user.Name, &user.DisplayName, &user.Icon)
				if err != nil {
					w.WriteHeader(http.StatusNotFound)
					w.Write([]byte("User not found"))
					return
				}
				user.Credentials, _ = loadCredentialsForUser(db, user.ID)
				json.NewEncoder(w).Encode(user)
			})

			r.Delete("/{id}", func(w http.ResponseWriter, r *http.Request) {
				id := chi.URLParam(r, "id")
				_, err := db.Exec("DELETE FROM users WHERE id=$1", id)
				if err != nil {
					w.WriteHeader(http.StatusInternalServerError)
					w.Write([]byte("DB error"))
					return
				}
				w.WriteHeader(http.StatusOK)
				w.Write([]byte("User deleted"))
			})
		})

		// Roles endpoint (demo: static list)
		r.Get("/roles", func(w http.ResponseWriter, r *http.Request) {
			if !isAdmin(r) {
				w.WriteHeader(http.StatusForbidden)
				w.Write([]byte("Admin only"))
				return
			}
			roles := []string{"admin", "user"}
			json.NewEncoder(w).Encode(roles)
		})

		// Permissions endpoint (demo: static list)
		r.Get("/permissions", func(w http.ResponseWriter, r *http.Request) {
			if !isAdmin(r) {
				w.WriteHeader(http.StatusForbidden)
				w.Write([]byte("Admin only"))
				return
			}
			perms := []string{"read", "write", "delete"}
			json.NewEncoder(w).Encode(perms)
		})
	})

	r.Post("/webauthn/register/begin", func(w http.ResponseWriter, r *http.Request) {
		token := r.Header.Get("Authorization")
		if !strings.HasPrefix(token, "Bearer ") {
			w.WriteHeader(http.StatusUnauthorized)
			w.Write([]byte("Missing token"))
			return
		}
		token = strings.TrimPrefix(token, "Bearer ")
		ti, err := oauthServer.Manager.LoadAccessToken(r.Context(), token)
		if err != nil || ti == nil || ti.GetUserID() == "" {
			w.WriteHeader(http.StatusUnauthorized)
			w.Write([]byte("Invalid token"))
			return
		}
		userID := ti.GetUserID()
		var user User
		err = db.QueryRow("SELECT id, email, name, created_at FROM users WHERE id=$1", userID).Scan(&user.ID, &user.Name, &user.DisplayName, &user.Icon)
		if err != nil {
			w.WriteHeader(http.StatusNotFound)
			w.Write([]byte("User not found"))
			return
		}
		user.Credentials, _ = loadCredentialsForUser(db, userID)
		userStore[user.ID] = &user
		options, sessionData, err := webAuthnInstance.BeginRegistration(&user)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte("Failed to begin registration"))
			return
		}
		sessionBytes, _ := json.Marshal(sessionData)
		http.SetCookie(w, &http.Cookie{Name: "webauthn_session", Value: string(sessionBytes), Path: "/", HttpOnly: true})
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(options)
	})

	r.Post("/webauthn/register/finish", func(w http.ResponseWriter, r *http.Request) {
		token := r.Header.Get("Authorization")
		if !strings.HasPrefix(token, "Bearer ") {
			w.WriteHeader(http.StatusUnauthorized)
			w.Write([]byte("Missing token"))
			return
		}
		token = strings.TrimPrefix(token, "Bearer ")
		ti, err := oauthServer.Manager.LoadAccessToken(r.Context(), token)
		if err != nil || ti == nil || ti.GetUserID() == "" {
			w.WriteHeader(http.StatusUnauthorized)
			w.Write([]byte("Invalid token"))
			return
		}
		userID := ti.GetUserID()
		user := userStore[userID]
		cookie, err := r.Cookie("webauthn_session")
		if err != nil {
			w.WriteHeader(http.StatusBadRequest)
			w.Write([]byte("Missing session"))
			return
		}
		var sessionData webauthn.SessionData
		err = json.Unmarshal([]byte(cookie.Value), &sessionData)
		if err != nil {
			w.WriteHeader(http.StatusBadRequest)
			w.Write([]byte("Failed to decode session data"))
			return
		}
		credential, err := webAuthnInstance.FinishRegistration(user, sessionData, r)
		if err != nil {
			w.WriteHeader(http.StatusBadRequest)
			w.Write([]byte("Failed to finish registration"))
			return
		}
		user.Credentials = append(user.Credentials, *credential)
		storeCredentialForUser(db, userID, *credential)
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("Passkey registered!"))
	})

	log.Println("User Service running on :4000")
	log.Fatal(http.ListenAndServe(":4000", r))
}
