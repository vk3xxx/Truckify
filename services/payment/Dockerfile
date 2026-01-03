FROM golang:1.25-alpine AS builder
WORKDIR /app
COPY services/payment/go.mod services/payment/go.sum* ./services/payment/
COPY shared ./shared
RUN cd services/payment && go mod download
COPY services/payment ./services/payment
RUN cd services/payment && CGO_ENABLED=0 GOOS=linux go build -o /payment-service ./cmd/server

FROM alpine:3.19
RUN apk --no-cache add ca-certificates
COPY --from=builder /payment-service /payment-service
EXPOSE 8012
CMD ["/payment-service"]
