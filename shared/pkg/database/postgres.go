package database

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	_ "github.com/lib/pq"
)

// PostgresConfig holds PostgreSQL configuration
type PostgresConfig struct {
	Host     string
	Port     int
	User     string
	Password string
	Database string
	SSLMode  string
	MaxConns int
	MinConns int
	MaxIdle  time.Duration
	MaxLife  time.Duration
}

// NewPostgresDB creates a new PostgreSQL database connection
func NewPostgresDB(config PostgresConfig) (*sql.DB, error) {
	dsn := fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		config.Host,
		config.Port,
		config.User,
		config.Password,
		config.Database,
		config.SSLMode,
	)

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open database connection: %w", err)
	}

	// Set connection pool settings
	if config.MaxConns > 0 {
		db.SetMaxOpenConns(config.MaxConns)
	} else {
		db.SetMaxOpenConns(25)
	}

	if config.MinConns > 0 {
		db.SetMaxIdleConns(config.MinConns)
	} else {
		db.SetMaxIdleConns(5)
	}

	if config.MaxIdle > 0 {
		db.SetConnMaxIdleTime(config.MaxIdle)
	} else {
		db.SetConnMaxIdleTime(5 * time.Minute)
	}

	if config.MaxLife > 0 {
		db.SetConnMaxLifetime(config.MaxLife)
	} else {
		db.SetConnMaxLifetime(30 * time.Minute)
	}

	// Test the connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return db, nil
}

// Close closes the database connection
func ClosePostgresDB(db *sql.DB) error {
	if db != nil {
		return db.Close()
	}
	return nil
}
