# Build stage
FROM golang:1.25-alpine AS builder

RUN apk add --no-cache git

WORKDIR /app

COPY shared/ ./shared/
COPY services/shipper/ ./services/shipper/

WORKDIR /app/services/shipper

RUN go mod download
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main ./cmd/server

# Final stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

COPY --from=builder /app/services/shipper/main .
COPY --from=builder /app/services/shipper/migrations ./migrations

EXPOSE 8003

CMD ["./main"]
