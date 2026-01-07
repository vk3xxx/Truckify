# Analytics Service

Business intelligence, demand forecasting, and dynamic pricing service for Truckify.

## Features

- **Dashboard Stats**: Real-time platform metrics
- **Demand Forecasting**: AI-powered job demand predictions
- **Dynamic Pricing**: Market-based price recommendations
- **Market Conditions**: Real-time supply/demand monitoring
- **Demand Heatmap**: Geographic demand visualization

## Endpoints

### Dashboard & Reports

```bash
# Dashboard statistics
GET /analytics/dashboard

# Jobs by status
GET /analytics/jobs/status

# Jobs by day (last N days)
GET /analytics/jobs/daily?days=7

# Revenue by day
GET /analytics/revenue/daily?days=7

# Top routes
GET /analytics/routes/top?limit=5
```

### Demand Forecasting

```bash
# Forecast demand for next N days (max 14)
GET /analytics/forecast/demand?days=7

# Response:
{
  "data": [
    {
      "route": "Sydney→Melbourne",
      "origin": "Sydney",
      "destination": "Melbourne",
      "date": "2026-01-08",
      "predicted_jobs": 12,
      "confidence": 0.95,
      "trend": "up",
      "seasonal_factor": 1.0,
      "historical_avg": 10.5
    }
  ]
}
```

```bash
# Demand heatmap by region
GET /analytics/forecast/heatmap

# Response:
{
  "data": [
    {
      "region": "Sydney",
      "latitude": -33.8688,
      "longitude": 151.2093,
      "intensity": 0.85,
      "job_count": 45,
      "avg_price": 1850.00
    }
  ]
}
```

### Dynamic Pricing

```bash
# Get pricing recommendation
GET /analytics/pricing/recommend?origin=Sydney&destination=Melbourne&base_price=1500

# Response:
{
  "data": {
    "route": "Sydney→Melbourne",
    "origin": "Sydney",
    "destination": "Melbourne",
    "base_price": 1500.00,
    "recommended_price": 1725.00,
    "min_price": 1200.00,
    "max_price": 3000.00,
    "price_multiplier": 1.15,
    "demand_level": "high",
    "supply_level": "medium",
    "factors": [
      {
        "name": "High Demand",
        "impact": 15,
        "description": "More jobs than available drivers"
      },
      {
        "name": "Peak Hours",
        "impact": 5,
        "description": "Higher demand during business hours"
      }
    ],
    "valid_until": "2026-01-07T22:30:00Z"
  }
}
```

### Market Conditions

```bash
# Get current market state
GET /analytics/market/conditions?region=Sydney

# Response:
{
  "data": {
    "region": "Sydney",
    "available_drivers": 15,
    "pending_jobs": 23,
    "supply_demand_ratio": 0.65,
    "avg_wait_time_minutes": 115,
    "surge_active": false,
    "surge_multiplier": 1.0,
    "updated_at": "2026-01-07T22:15:00Z"
  }
}
```

## Pricing Algorithm

### Factors

1. **Supply/Demand Ratio**
   - Ratio < 0.5: +15% (high demand)
   - Ratio > 1.5: -10% (low demand)

2. **Driver Availability**
   - < 5 drivers: +20% (limited supply)

3. **Time of Day**
   - Peak hours (6-9am, 4-7pm): +5%

4. **Day of Week**
   - Friday: +8%
   - Sunday: -5%

5. **Seasonal Factors**
   - November/December: +25%
   - October: +15%
   - April/May: +10%
   - January/February: -10%

6. **Surge Pricing**
   - Activated when supply < 30% of demand
   - Multiplier: 1.5x to 2.5x

### Price Bounds
- Minimum: 0.8x base price
- Maximum: 2.0x base price

## Forecasting Algorithm

### Data Sources
- Historical job data by route
- Day-of-week patterns
- Seasonal trends

### Methodology
1. Aggregate jobs by route and day-of-week
2. Calculate historical averages
3. Apply seasonal factors
4. Determine trend (up/down/stable)
5. Confidence decreases 5% per forecast day

### Seasonal Factors
| Month | Factor |
|-------|--------|
| November, December | 1.25 |
| October | 1.15 |
| April, May | 1.10 |
| January, February | 0.90 |
| Other months | 1.00 |

## Configuration

### Environment Variables

```bash
AUTH_URL=http://localhost:8001
JOB_URL=http://localhost:8006
DRIVER_URL=http://localhost:8004
PAYMENT_URL=http://localhost:8012
FLEET_URL=http://localhost:8005
RATING_URL=http://localhost:8013
PORT=8015
```

## Testing

```bash
cd services/analytics
GOWORK=off go test ./...
```

**Tests:**
- Handler tests (health, validation)
- Forecasting tests (seasonal factors, route parsing)

## Health Check

```bash
GET /health

# Response:
{
  "data": {
    "status": "healthy",
    "service": "analytics-service"
  }
}
```
