# Truckify - Hello World

A simple Go web application for testing deployment.

## Features

- Hello World web server
- Health check endpoint
- Configurable port via environment variable
- Docker support

## Local Development

### Prerequisites

- Go 1.24 or later

### Running Locally

```bash
# Run the application
go run main.go

# Or build and run
go build -o truckify main.go
./truckify
```

The application will start on `http://localhost:8080`

## Docker Deployment

### Build the Docker image

```bash
docker build -t truckify .
```

### Run the container

```bash
docker run -p 8080:8080 truckify
```

### Run with custom port

```bash
docker run -p 3000:3000 -e PORT=3000 truckify
```

## API Endpoints

- `GET /` - Hello World message
- `GET /health` - Health check endpoint

## Environment Variables

- `PORT` - Server port (default: 8080)

## Testing

```bash
# Test the hello world endpoint
curl http://localhost:8080/

# Test the health endpoint
curl http://localhost:8080/health
``` 