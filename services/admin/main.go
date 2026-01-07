package main

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
)

type ConfigField struct {
	Key       string `json:"key"`
	Label     string `json:"label"`
	Type      string `json:"type"`
	Value     string `json:"value"`
	Encrypted bool   `json:"encrypted"`
	Required  bool   `json:"required"`
}

type ConfigSection struct {
	Name        string        `json:"name"`
	Description string        `json:"description"`
	Fields      []ConfigField `json:"fields"`
}

type SystemConfig struct {
	Sections     []ConfigSection `json:"sections"`
	LastModified string          `json:"lastModified"`
	ModifiedBy   string          `json:"modifiedBy"`
}

type BackupRequest struct {
	Password string `json:"password"`
}

var (
	configStore = make(map[string]string)
	configMutex = make(chan bool, 1)
)

func init() {
	configMutex <- true
}

func encryptValue(plaintext, password string) (string, error) {
	key := sha256.Sum256([]byte(password))
	block, err := aes.NewCipher(key[:])
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

func decryptValue(ciphertext, password string) (string, error) {
	key := sha256.Sum256([]byte(password))
	block, err := aes.NewCipher(key[:])
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	data, err := base64.StdEncoding.DecodeString(ciphertext)
	if err != nil {
		return "", err
	}

	nonceSize := gcm.NonceSize()
	nonce, ciphertext2 := data[:nonceSize], data[nonceSize:]
	plaintext, err := gcm.Open(nil, nonce, ciphertext2, nil)
	if err != nil {
		return "", err
	}

	return string(plaintext), nil
}

func maskValue(value string) string {
	if value == "" {
		return ""
	}
	if len(value) <= 4 {
		return "••••••••"
	}
	return "••••••••" + value[len(value)-4:]
}

func getEnvOrDefault(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}

func getConfig(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	
	<-configMutex
	defer func() { configMutex <- true }()

	config := SystemConfig{
		Sections: []ConfigSection{
			{
				Name:        "API Configuration",
				Description: "API Gateway and service settings",
				Fields: []ConfigField{
					{
						Key:       "api_port",
						Label:     "API Gateway Port",
						Type:      "number",
						Value:     os.Getenv("API_PORT"),
						Encrypted: false,
						Required:  true,
					},
					{
						Key:       "api_timeout",
						Label:     "Request Timeout (seconds)",
						Type:      "number",
						Value:     os.Getenv("API_TIMEOUT"),
						Encrypted: false,
						Required:  false,
					},
					{
						Key:       "rate_limit",
						Label:     "Rate Limit (requests/min)",
						Type:      "number",
						Value:     os.Getenv("RATE_LIMIT"),
						Encrypted: false,
						Required:  false,
					},
				},
			},
			{
				Name:        "Security",
				Description: "JWT and authentication settings",
				Fields: []ConfigField{
					{
						Key:       "jwt_secret",
						Label:     "JWT Secret",
						Type:      "password",
						Value:     maskValue(os.Getenv("JWT_SECRET")),
						Encrypted: true,
						Required:  true,
					},
					{
						Key:       "jwt_expiry",
						Label:     "JWT Expiry (minutes)",
						Type:      "number",
						Value:     os.Getenv("JWT_EXPIRY"),
						Encrypted: false,
						Required:  false,
					},
					{
						Key:       "refresh_token_expiry",
						Label:     "Refresh Token Expiry (days)",
						Type:      "number",
						Value:     os.Getenv("REFRESH_TOKEN_EXPIRY"),
						Encrypted: false,
						Required:  false,
					},
				},
			},
			{
				Name:        "Database",
				Description: "Database connection settings",
				Fields: []ConfigField{
					{
						Key:       "db_host",
						Label:     "Database Host",
						Type:      "text",
						Value:     os.Getenv("DB_HOST"),
						Encrypted: false,
						Required:  true,
					},
					{
						Key:       "db_port",
						Label:     "Database Port",
						Type:      "number",
						Value:     os.Getenv("DB_PORT"),
						Encrypted: false,
						Required:  true,
					},
					{
						Key:       "db_user",
						Label:     "Database User",
						Type:      "text",
						Value:     os.Getenv("DB_USER"),
						Encrypted: false,
						Required:  true,
					},
					{
						Key:       "db_password",
						Label:     "Database Password",
						Type:      "password",
						Value:     maskValue(os.Getenv("DB_PASSWORD")),
						Encrypted: true,
						Required:  true,
					},
					{
						Key:       "db_name",
						Label:     "Database Name",
						Type:      "text",
						Value:     os.Getenv("DB_NAME"),
						Encrypted: false,
						Required:  true,
					},
				},
			},
			{
				Name:        "External API URLs",
				Description: "Third-party service endpoints",
				Fields: []ConfigField{
					{
						Key:       "payment_api_url",
						Label:     "Payment Gateway URL",
						Type:      "url",
						Value:     getEnvOrDefault("PAYMENT_API_URL", "https://api.stripe.com/v1"),
						Encrypted: false,
						Required:  false,
					},
					{
						Key:       "sms_api_url",
						Label:     "SMS Service URL",
						Type:      "url",
						Value:     getEnvOrDefault("SMS_API_URL", "https://api.twilio.com"),
						Encrypted: false,
						Required:  false,
					},
					{
						Key:       "email_api_url",
						Label:     "Email Service URL",
						Type:      "url",
						Value:     getEnvOrDefault("EMAIL_API_URL", "https://api.sendgrid.com/v3"),
						Encrypted: false,
						Required:  false,
					},
					{
						Key:       "maps_api_url",
						Label:     "Maps/Geocoding URL",
						Type:      "url",
						Value:     getEnvOrDefault("MAPS_API_URL", "https://maps.googleapis.com/maps/api"),
						Encrypted: false,
						Required:  false,
					},
					{
						Key:       "tracking_api_url",
						Label:     "GPS Tracking URL",
						Type:      "url",
						Value:     getEnvOrDefault("TRACKING_API_URL", ""),
						Encrypted: false,
						Required:  false,
					},
				},
			},
			{
				Name:        "External API Keys",
				Description: "Third-party API credentials (masked for security)",
				Fields: []ConfigField{
					{
						Key:       "payment_api_key",
						Label:     "Payment Gateway API Key",
						Type:      "password",
						Value:     maskValue(os.Getenv("PAYMENT_API_KEY")),
						Encrypted: true,
						Required:  false,
					},
					{
						Key:       "sms_api_key",
						Label:     "SMS Service API Key",
						Type:      "password",
						Value:     maskValue(os.Getenv("SMS_API_KEY")),
						Encrypted: true,
						Required:  false,
					},
					{
						Key:       "email_api_key",
						Label:     "Email Service API Key",
						Type:      "password",
						Value:     maskValue(os.Getenv("EMAIL_API_KEY")),
						Encrypted: true,
						Required:  false,
					},
					{
						Key:       "maps_api_key",
						Label:     "Maps/Geocoding API Key",
						Type:      "password",
						Value:     maskValue(os.Getenv("MAPS_API_KEY")),
						Encrypted: true,
						Required:  false,
					},
				},
			},
		},
		LastModified: time.Now().UTC().Format(time.RFC3339),
		ModifiedBy:   "system",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(config)
}

func saveConfig(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	
	<-configMutex
	defer func() { configMutex <- true }()

	var config SystemConfig
	if err := json.NewDecoder(r.Body).Decode(&config); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	for _, section := range config.Sections {
		for _, field := range section.Fields {
			if field.Value != "" {
				os.Setenv(field.Key, field.Value)
				configStore[field.Key] = field.Value
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

func backupConfig(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	
	<-configMutex
	defer func() { configMutex <- true }()

	var req BackupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	config := SystemConfig{
		Sections: []ConfigSection{
			{
				Name:        "API Configuration",
				Description: "API Gateway and service settings",
				Fields: []ConfigField{
					{
						Key:       "api_port",
						Label:     "API Gateway Port",
						Type:      "number",
						Value:     os.Getenv("API_PORT"),
						Encrypted: false,
						Required:  true,
					},
				},
			},
		},
		LastModified: time.Now().UTC().Format(time.RFC3339),
		ModifiedBy:   "system",
	}

	data, _ := json.Marshal(config)
	encrypted, err := encryptValue(string(data), req.Password)
	if err != nil {
		http.Error(w, "Encryption failed", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"backup": encrypted})
}

func restoreConfig(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	
	<-configMutex
	defer func() { configMutex <- true }()

	password := r.FormValue("password")
	if password == "" {
		http.Error(w, "Password required", http.StatusBadRequest)
		return
	}

	file, _, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "File required", http.StatusBadRequest)
		return
	}
	defer file.Close()

	data, _ := io.ReadAll(file)
	var backup map[string]string
	json.Unmarshal(data, &backup)

	if encryptedData, ok := backup["backup"]; ok {
		decrypted, err := decryptValue(encryptedData, password)
		if err != nil {
			http.Error(w, "Invalid password or corrupted backup", http.StatusUnauthorized)
			return
		}

		var config SystemConfig
		if err := json.Unmarshal([]byte(decrypted), &config); err != nil {
			http.Error(w, "Invalid backup format", http.StatusBadRequest)
			return
		}

		for _, section := range config.Sections {
			for _, field := range section.Fields {
				if field.Value != "" {
					os.Setenv(field.Key, field.Value)
				}
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "restored"})
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		
		next.ServeHTTP(w, r)
	})
}

func main() {
	godotenv.Load()

	router := mux.NewRouter()
	router.HandleFunc("/api/v1/admin/config", getConfig).Methods("GET")
	router.HandleFunc("/api/v1/admin/config", saveConfig).Methods("POST")
	router.HandleFunc("/api/v1/admin/config/backup", backupConfig).Methods("POST")
	router.HandleFunc("/api/v1/admin/config/restore", restoreConfig).Methods("POST")

	port := os.Getenv("ADMIN_PORT")
	if port == "" {
		port = "8017"
	}

	log.Printf("Admin service listening on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, corsMiddleware(router)))
}
