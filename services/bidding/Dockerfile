FROM golang:1.25-alpine AS builder
WORKDIR /app
COPY services/bidding/go.mod services/bidding/go.sum ./services/bidding/
COPY shared ./shared
RUN cd services/bidding && go mod download
COPY services/bidding ./services/bidding
RUN cd services/bidding && CGO_ENABLED=0 GOOS=linux go build -o /bidding-service ./cmd/server

FROM alpine:3.19
RUN apk --no-cache add ca-certificates
COPY --from=builder /bidding-service /bidding-service
EXPOSE 8008
CMD ["/bidding-service"]
