package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
	"github.com/google/uuid"
)

func main() {
	dbHost := os.Getenv("DB_HOST")
	if dbHost == "" {
		dbHost = "localhost"
	}
	
	connStr := fmt.Sprintf("host=%s port=5432 user=truckify password=truckify_password dbname=auth sslmode=disable", dbHost)
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	email := "admin@truckify.com"
	password := "admin123"
	
	hash, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	id := uuid.New()

	_, err = db.Exec(`
		INSERT INTO users (id, email, password_hash, user_type, status, email_verified, created_at, updated_at)
		VALUES ($1, $2, $3, 'admin', 'active', true, NOW(), NOW())
		ON CONFLICT (email) DO UPDATE SET user_type = 'admin', password_hash = $3
	`, id, email, string(hash))
	
	if err != nil {
		log.Fatal(err)
	}
	
	fmt.Printf("Admin user created/updated:\nEmail: %s\nPassword: %s\n", email, password)
}
