package logger

import (
	"context"
	"log/slog"
	"os"
)

type Logger struct {
	*slog.Logger
}

// New creates a new structured logger
func New(serviceName string, level string) *Logger {
	var logLevel slog.Level
	switch level {
	case "debug":
		logLevel = slog.LevelDebug
	case "info":
		logLevel = slog.LevelInfo
	case "warn":
		logLevel = slog.LevelWarn
	case "error":
		logLevel = slog.LevelError
	default:
		logLevel = slog.LevelInfo
	}

	handler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: logLevel,
	})

	logger := slog.New(handler).With(
		slog.String("service", serviceName),
	)

	return &Logger{Logger: logger}
}

// WithContext adds context values to the logger
func (l *Logger) WithContext(ctx context.Context) *Logger {
	// Extract request ID from context if it exists
	if requestID, ok := ctx.Value("request_id").(string); ok {
		return &Logger{Logger: l.Logger.With(slog.String("request_id", requestID))}
	}
	return l
}

// WithFields adds additional fields to the logger
func (l *Logger) WithFields(fields map[string]interface{}) *Logger {
	args := make([]any, 0, len(fields)*2)
	for key, value := range fields {
		args = append(args, key, value)
	}
	return &Logger{Logger: l.Logger.With(args...)}
}

// Fatal logs a fatal error and exits
func (l *Logger) Fatal(msg string, args ...any) {
	l.Logger.Error(msg, args...)
	os.Exit(1)
}
