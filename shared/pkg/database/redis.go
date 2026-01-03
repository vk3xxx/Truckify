package database

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// RedisConfig holds Redis configuration
type RedisConfig struct {
	Host     string
	Port     int
	Password string
	DB       int
	MaxConns int
	MinConns int
}

// NewRedisClient creates a new Redis client
func NewRedisClient(config RedisConfig) (*redis.Client, error) {
	client := redis.NewClient(&redis.Options{
		Addr:         fmt.Sprintf("%s:%d", config.Host, config.Port),
		Password:     config.Password,
		DB:           config.DB,
		PoolSize:     getRedisPoolSize(config.MaxConns, 10),
		MinIdleConns: getRedisPoolSize(config.MinConns, 5),
		MaxRetries:   3,
		DialTimeout:  5 * time.Second,
		ReadTimeout:  3 * time.Second,
		WriteTimeout: 3 * time.Second,
	})

	// Test the connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to ping Redis: %w", err)
	}

	return client, nil
}

// CloseRedisClient closes the Redis connection
func CloseRedisClient(client *redis.Client) error {
	if client != nil {
		return client.Close()
	}
	return nil
}

// getRedisPoolSize returns the pool size or default value
func getRedisPoolSize(size, defaultSize int) int {
	if size > 0 {
		return size
	}
	return defaultSize
}
