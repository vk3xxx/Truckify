# Build stage
FROM golang:1.25-alpine AS builder

RUN apk add --no-cache git

WORKDIR /app

# Copy shared module first
COPY shared/ ./shared/

# Copy auth service module
COPY services/auth/ ./services/auth/

WORKDIR /app/services/auth

# Download dependencies without go.work
RUN go mod download

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main ./cmd/server

# Final stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates postgresql-client

WORKDIR /root/

COPY --from=builder /app/services/auth/main .
COPY --from=builder /app/services/auth/migrations ./migrations

EXPOSE 8001

CMD ["./main"]
