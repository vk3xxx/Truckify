# Build stage
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Copy the entire source code first
COPY . .

# Download dependencies (go.mod should be present)
RUN go mod download

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .

# Final stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates curl

WORKDIR /root/

# Copy the binary from builder stage
COPY --from=builder /app/main .

# Expose port
EXPOSE 3000

# Add healthcheck for /health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 CMD curl -f http://localhost:3000/health || exit 1

# Run the application with explicit host binding
CMD ["./main"] 