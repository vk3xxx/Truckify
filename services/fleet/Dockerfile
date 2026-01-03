FROM golang:1.25-alpine AS builder
WORKDIR /app
COPY shared/ ./shared/
COPY services/fleet/ ./services/fleet/
WORKDIR /app/services/fleet
RUN go mod download
RUN CGO_ENABLED=0 GOOS=linux go build -o /fleet-service ./cmd/server

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /app
COPY --from=builder /fleet-service .
COPY --from=builder /app/services/fleet/migrations ./migrations
EXPOSE 8005
CMD ["./fleet-service"]
