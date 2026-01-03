FROM golang:1.25-alpine AS builder
WORKDIR /app
COPY shared/ ./shared/
COPY services/compliance/ ./services/compliance/
WORKDIR /app/services/compliance
RUN go mod download && CGO_ENABLED=0 go build -o server ./cmd/server

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /app
COPY --from=builder /app/services/compliance/server .
EXPOSE 8016
CMD ["./server"]
