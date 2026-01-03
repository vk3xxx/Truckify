FROM golang:1.25-alpine AS builder
WORKDIR /app
COPY shared/ ./shared/
COPY services/analytics/ ./services/analytics/
WORKDIR /app/services/analytics
RUN go mod download
RUN CGO_ENABLED=0 GOOS=linux go build -o /analytics-service ./cmd/server

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /app
COPY --from=builder /analytics-service .
EXPOSE 8015
CMD ["./analytics-service"]
