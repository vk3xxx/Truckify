FROM golang:1.25-alpine AS builder
WORKDIR /app
COPY services/notification/go.mod services/notification/go.sum* ./services/notification/
COPY shared ./shared
RUN cd services/notification && go mod download
COPY services/notification ./services/notification
RUN cd services/notification && CGO_ENABLED=0 GOOS=linux go build -o /notification-service ./cmd/server

FROM alpine:3.19
RUN apk --no-cache add ca-certificates
COPY --from=builder /notification-service /notification-service
EXPOSE 8014
CMD ["/notification-service"]
