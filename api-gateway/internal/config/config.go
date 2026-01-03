package config

import (
	"time"

	"truckify/shared/pkg/config"
)

// Config holds the API Gateway configuration
type Config struct {
	Port              string
	LogLevel          string
	JWTSecret         string
	RedisHost         string
	RedisPort         int
	RedisPassword     string
	RateLimitRequests int
	RateLimitWindow   time.Duration
	ConsulHost        string
	ConsulPort        int
	AllowedOrigins    []string
}

// Load loads configuration from environment variables
func Load() *Config {
	return &Config{
		Port:              config.GetEnv("PORT", "8000"),
		LogLevel:          config.GetEnv("LOG_LEVEL", "info"),
		JWTSecret:         config.MustGetEnv("JWT_SECRET"),
		RedisHost:         config.GetEnv("REDIS_HOST", "localhost"),
		RedisPort:         config.GetEnvInt("REDIS_PORT", 6379),
		RedisPassword:     config.GetEnv("REDIS_PASSWORD", ""),
		RateLimitRequests: config.GetEnvInt("RATE_LIMIT_REQUESTS", 100),
		RateLimitWindow:   time.Duration(config.GetEnvInt("RATE_LIMIT_WINDOW_SECONDS", 60)) * time.Second,
		ConsulHost:        config.GetEnv("CONSUL_HOST", "localhost"),
		ConsulPort:        config.GetEnvInt("CONSUL_PORT", 8500),
		AllowedOrigins:    []string{config.GetEnv("ALLOWED_ORIGINS", "*")},
	}
}
