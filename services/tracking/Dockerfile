FROM golang:1.25-alpine AS builder
WORKDIR /app
COPY services/tracking/go.mod services/tracking/go.sum* ./services/tracking/
COPY shared ./shared
RUN cd services/tracking && go mod download
COPY services/tracking ./services/tracking
RUN cd services/tracking && CGO_ENABLED=0 GOOS=linux go build -o /tracking-service ./cmd/server

FROM alpine:3.19
RUN apk --no-cache add ca-certificates
COPY --from=builder /tracking-service /tracking-service
EXPOSE 8011
CMD ["/tracking-service"]
