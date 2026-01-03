FROM golang:1.25-alpine AS builder
WORKDIR /app
COPY services/rating/go.mod services/rating/go.sum* ./services/rating/
COPY shared ./shared
RUN cd services/rating && go mod download
COPY services/rating ./services/rating
RUN cd services/rating && CGO_ENABLED=0 GOOS=linux go build -o /rating-service ./cmd/server

FROM alpine:3.19
RUN apk --no-cache add ca-certificates
COPY --from=builder /rating-service /rating-service
EXPOSE 8013
CMD ["/rating-service"]
