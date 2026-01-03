FROM golang:1.25-alpine AS builder
WORKDIR /app
COPY services/driver/go.mod services/driver/go.sum ./services/driver/
COPY shared ./shared
RUN cd services/driver && go mod download
COPY services/driver ./services/driver
RUN cd services/driver && CGO_ENABLED=0 go build -o /driver-service ./cmd/server

FROM alpine:latest
RUN apk --no-cache add ca-certificates
COPY --from=builder /driver-service /driver-service
EXPOSE 8004
CMD ["/driver-service"]
