FROM golang:1.25-alpine AS builder
WORKDIR /app
COPY services/matching/go.mod services/matching/go.sum ./services/matching/
COPY shared ./shared
RUN cd services/matching && go mod download
COPY services/matching ./services/matching
RUN cd services/matching && CGO_ENABLED=0 go build -o /matching-service ./cmd/server

FROM alpine:latest
RUN apk --no-cache add ca-certificates
COPY --from=builder /matching-service /matching-service
EXPOSE 8007
CMD ["/matching-service"]
