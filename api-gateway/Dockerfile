# Build stage
FROM golang:1.25-alpine AS builder

RUN apk add --no-cache git

WORKDIR /app

# Copy shared module first
COPY shared/ ./shared/

# Copy api-gateway module
COPY api-gateway/ ./api-gateway/

WORKDIR /app/api-gateway

# Download dependencies without go.work
RUN go mod download

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main ./cmd/server

# Final stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

COPY --from=builder /app/api-gateway/main .

EXPOSE 8000

CMD ["./main"]
