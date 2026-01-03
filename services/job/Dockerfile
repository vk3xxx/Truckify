FROM golang:1.25-alpine AS builder
WORKDIR /app
COPY services/job/go.mod services/job/go.sum ./services/job/
COPY shared ./shared
RUN cd services/job && go mod download
COPY services/job ./services/job
RUN cd services/job && CGO_ENABLED=0 go build -o /job-service ./cmd/server

FROM alpine:latest
RUN apk --no-cache add ca-certificates
COPY --from=builder /job-service /job-service
EXPOSE 8006
CMD ["/job-service"]
