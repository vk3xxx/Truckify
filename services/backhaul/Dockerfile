FROM golang:1.25-alpine AS builder
WORKDIR /app
COPY services/backhaul/go.mod services/backhaul/go.sum* ./services/backhaul/
COPY shared ./shared
RUN cd services/backhaul && go mod download
COPY services/backhaul ./services/backhaul
RUN cd services/backhaul && CGO_ENABLED=0 GOOS=linux go build -o /backhaul-service ./cmd/server

FROM alpine:3.19
RUN apk --no-cache add ca-certificates
COPY --from=builder /backhaul-service /backhaul-service
EXPOSE 8010
CMD ["/backhaul-service"]
