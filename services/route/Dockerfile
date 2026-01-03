FROM golang:1.25-alpine AS builder
WORKDIR /app
COPY services/route/go.mod services/route/go.sum* ./services/route/
COPY shared ./shared
RUN cd services/route && go mod download
COPY services/route ./services/route
RUN cd services/route && CGO_ENABLED=0 GOOS=linux go build -o /route-service ./cmd/server

FROM alpine:3.19
RUN apk --no-cache add ca-certificates
COPY --from=builder /route-service /route-service
EXPOSE 8009
CMD ["/route-service"]
