# Build stage
FROM golang:1.25-alpine AS builder

RUN apk add --no-cache git

WORKDIR /app

COPY shared/ ./shared/
COPY services/user/ ./services/user/

WORKDIR /app/services/user

RUN go mod download
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main ./cmd/server

# Final stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

COPY --from=builder /app/services/user/main .
COPY --from=builder /app/services/user/migrations ./migrations

EXPOSE 8002

CMD ["./main"]
