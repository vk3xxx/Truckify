FROM golang:1.21-alpine AS builder

WORKDIR /app

COPY services/admin/go.mod services/admin/go.sum ./
RUN go mod download

COPY services/admin/ ./

RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o admin-service .

FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

COPY --from=builder /app/admin-service .

EXPOSE 8017

CMD ["./admin-service"]
