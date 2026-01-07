# API Reference

Complete API documentation for Truckify platform.

## Base URLs

| Service | URL | Description |
|---------|-----|-------------|
| API Gateway | http://localhost:8000 | Main entry point |
| Auth | http://localhost:8001 | Authentication |
| User | http://localhost:8002 | User profiles |
| Driver | http://localhost:8004 | Driver management |
| Job | http://localhost:8006 | Job management |
| Tracking | http://localhost:8011 | GPS tracking |
| Notification | http://localhost:8014 | Notifications & WebSocket |
| Analytics | http://localhost:8015 | BI & forecasting |
| Admin | http://localhost:8017 | System config |

## Authentication

All protected endpoints require:
```
Authorization: Bearer <access_token>
X-User-ID: <user_id>
```

### Register

```http
POST /register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "user_type": "driver"  // driver, shipper, fleet_operator, dispatcher
}
```

### Login

```http
POST /login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "user_type": "driver",
      "status": "active"
    },
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "expires_in": 900
  }
}
```

### Refresh Token

```http
POST /refresh
Content-Type: application/json

{
  "refresh_token": "eyJ..."
}
```

### Passkey Authentication

```http
# Begin registration
POST /passkey/register/begin
Authorization: Bearer <token>

# Finish registration
POST /passkey/register/finish
{
  "name": "My iPhone",
  "response": "<webauthn_response>"
}

# Begin login
POST /passkey/login/begin
{
  "email": "user@example.com"
}

# Finish login
POST /passkey/login/finish
{
  "email": "user@example.com",
  "response": "<webauthn_response>"
}
```

### Email Verification

```http
# Verify email (from link in email)
GET /verify-email?token=<verification_token>

# Resend verification email
POST /resend-verification
Content-Type: application/json

{
  "email": "user@example.com"
}
```

### Password Reset

```http
# Request password reset
POST /forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}

# Reset password (with token from email)
POST /reset-password
Content-Type: application/json

{
  "token": "<reset_token>",
  "new_password": "newpassword123"
}
```

---

## Jobs

### List Jobs

```http
GET /jobs?status=pending&limit=20
Authorization: Bearer <token>
```

### Create Job

```http
POST /jobs
Authorization: Bearer <token>
Content-Type: application/json

{
  "pickup_city": "Sydney",
  "pickup_state": "NSW",
  "pickup_address": "123 Main St",
  "pickup_latitude": -33.8688,
  "pickup_longitude": 151.2093,
  "delivery_city": "Melbourne",
  "delivery_state": "VIC",
  "delivery_address": "456 Oak Ave",
  "delivery_latitude": -37.8136,
  "delivery_longitude": 144.9631,
  "pickup_date": "2026-01-15",
  "delivery_date": "2026-01-16",
  "cargo_type": "general",
  "weight": 15000,
  "vehicle_type": "flatbed",
  "price": 2500
}
```

### Get Job

```http
GET /jobs/{id}
Authorization: Bearer <token>
```

### Update Job Status

```http
PUT /jobs/{id}/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "in_transit"
}
```

### Accept Job

```http
POST /jobs/{id}/accept
Authorization: Bearer <token>
```

---

## Tracking

### Update Location

```http
POST /tracking/update
Authorization: Bearer <token>
Content-Type: application/json

{
  "job_id": "uuid",
  "driver_id": "uuid",
  "latitude": -33.8688,
  "longitude": 151.2093,
  "speed": 60.5,
  "heading": 180,
  "event_type": "location"
}
```

### Get Job Tracking History

```http
GET /tracking/job/{job_id}/history
Authorization: Bearer <token>
```

### Get Driver Current Location

```http
GET /tracking/driver/{driver_id}/location
Authorization: Bearer <token>
```

---

## Analytics

### Dashboard Stats

```http
GET /analytics/dashboard
```

**Response:**
```json
{
  "data": {
    "total_jobs": 150,
    "active_jobs": 23,
    "completed_jobs": 120,
    "total_drivers": 45,
    "active_drivers": 30,
    "total_shippers": 25,
    "total_revenue": 185000.00,
    "avg_job_value": 1541.67
  }
}
```

### Demand Forecast

```http
GET /analytics/forecast/demand?days=7
```

### Dynamic Pricing

```http
GET /analytics/pricing/recommend?origin=Sydney&destination=Melbourne&base_price=1500
```

### Market Conditions

```http
GET /analytics/market/conditions?region=Sydney
```

### Demand Heatmap

```http
GET /analytics/forecast/heatmap
```

---

## Notifications

### WebSocket Connection

```javascript
const ws = new WebSocket('ws://localhost:8014/ws?token=<access_token>');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // data.type: 'message', 'notification', 'typing', 'public_key'
  // data.payload: message content
};
```

### Send Chat Message

```javascript
ws.send(JSON.stringify({
  type: 'message',
  payload: {
    chatId: 'chat-uuid',
    content: 'Hello!',
    // For E2E encryption:
    encrypted: true,
    encryptedPayload: {
      ciphertext: '...',
      iv: '...',
      sessionKey: {
        forSender: '...',
        forRecipient: '...',
        forAdmin: '...'
      }
    }
  }
}));
```

### Share Public Key (E2E)

```javascript
ws.send(JSON.stringify({
  type: 'public_key',
  payload: { publicKey: 'base64-encoded-key' }
}));
```

### Register Push Token

```http
POST /notifications/register
Authorization: Bearer <token>
Content-Type: application/json

{
  "push_token": "ExponentPushToken[xxx]",
  "platform": "ios"
}
```

---

## Admin

### Get System Config

```http
GET /api/v1/admin/config
```

### Save System Config

```http
POST /api/v1/admin/config
Content-Type: application/json

{
  "sections": [...]
}
```

### Get Admin Public Key (E2E)

```http
GET /admin/public-key
```

### Decrypt Message (Compliance)

```http
POST /api/v1/admin/decrypt
Content-Type: application/json

{
  "ciphertext": "...",
  "iv": "...",
  "sessionKey": "..."  // forAdmin key
}
```

---

## Documents

### Upload Document

```http
POST /documents/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <binary>
type: license|insurance|registration|pod|signature
jobId: <optional>
```

### Get User Documents

```http
GET /documents?type=license
Authorization: Bearer <token>
```

### Delete Document

```http
DELETE /documents/{id}
Authorization: Bearer <token>
```

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format"
  },
  "metadata": {
    "timestamp": "2026-01-07T22:00:00Z",
    "request_id": "req-uuid"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| VALIDATION_ERROR | 400 | Invalid request data |
| UNAUTHORIZED | 401 | Missing or invalid token |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| CONFLICT | 409 | Resource already exists |
| INTERNAL_ERROR | 500 | Server error |

---

## Rate Limiting

- Default: 100 requests/minute per IP
- Auth endpoints: 10 requests/minute per IP
- WebSocket: 60 messages/minute per connection

Headers returned:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704672000
```
