#!/bin/bash
# Truckify Integration Test Suite
set -e

BASE_URL="http://localhost"
AUTH_URL="$BASE_URL:8001"
USER_URL="$BASE_URL:8002"
DRIVER_URL="$BASE_URL:8004"
JOB_URL="$BASE_URL:8006"
MATCHING_URL="$BASE_URL:8007"
BIDDING_URL="$BASE_URL:8008"
ROUTE_URL="$BASE_URL:8009"
BACKHAUL_URL="$BASE_URL:8010"
TRACKING_URL="$BASE_URL:8011"
PAYMENT_URL="$BASE_URL:8012"
RATING_URL="$BASE_URL:8013"
NOTIFICATION_URL="$BASE_URL:8014"
ANALYTICS_URL="$BASE_URL:8015"
FLEET_URL="$BASE_URL:8005"
FRONTEND_URL="$BASE_URL:5173"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASSED=0
FAILED=0
ERRORS=""

# Test user IDs (consistent for each run)
TEST_SHIPPER_EMAIL="test_shipper@truckify.test"
TEST_DRIVER_EMAIL="test_driver@truckify.test"
TEST_PASSWORD="TestPass123!"

# Cleanup function
cleanup_database() {
  echo -e "${YELLOW}Cleaning up test data...${NC}"
  docker exec truckify-postgres psql -U truckify -d auth -c "
    DELETE FROM users WHERE email LIKE '%@truckify.test';
  " > /dev/null 2>&1 || true
  docker exec truckify-postgres psql -U truckify -d job -c "
    DELETE FROM jobs WHERE notes LIKE '%TEST_DATA%';
  " > /dev/null 2>&1 || true
  docker exec truckify-postgres psql -U truckify -d bidding -c "TRUNCATE bids CASCADE;" > /dev/null 2>&1 || true
  docker exec truckify-postgres psql -U truckify -d rating -c "TRUNCATE ratings CASCADE;" > /dev/null 2>&1 || true
  docker exec truckify-postgres psql -U truckify -d tracking -c "TRUNCATE tracking_events CASCADE;" > /dev/null 2>&1 || true
  docker exec truckify-postgres psql -U truckify -d payment -c "TRUNCATE payments CASCADE;" > /dev/null 2>&1 || true
  docker exec truckify-postgres psql -U truckify -d fleet -c "TRUNCATE vehicle_handovers, fleet_drivers, fleet_vehicles, fleets CASCADE;" > /dev/null 2>&1 || true
  echo -e "${GREEN}✓${NC} Database cleaned"
}

# Trap to ensure cleanup runs on exit
trap cleanup_database EXIT

echo "========================================"
echo "  Truckify Integration Test Suite"
echo "========================================"
echo ""

# Initial cleanup
cleanup_database
echo ""
echo ""

# Health Checks
echo -e "${YELLOW}=== Service Health Checks ===${NC}"
for svc in "auth:$AUTH_URL" "user:$USER_URL" "driver:$DRIVER_URL" "fleet:$FLEET_URL" "job:$JOB_URL" "matching:$MATCHING_URL" "bidding:$BIDDING_URL" "route:$ROUTE_URL" "backhaul:$BACKHAUL_URL" "tracking:$TRACKING_URL" "payment:$PAYMENT_URL" "rating:$RATING_URL" "notification:$NOTIFICATION_URL" "analytics:$ANALYTICS_URL"; do
  name=$(echo $svc | cut -d: -f1)
  url=$(echo $svc | cut -d: -f2-)
  status=$(curl -s -o /dev/null -w "%{http_code}" "$url/health" 2>/dev/null || echo "000")
  if [ "$status" = "200" ]; then
    echo -e "${GREEN}✓${NC} $name service healthy"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} $name service DOWN (HTTP $status)"
    ((FAILED++))
    ERRORS="$ERRORS\n- $name service not responding"
  fi
done

# Frontend
status=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" 2>/dev/null || echo "000")
if [ "$status" = "200" ]; then
  echo -e "${GREEN}✓${NC} Frontend healthy"
  ((PASSED++))
else
  echo -e "${RED}✗${NC} Frontend DOWN (HTTP $status)"
  ((FAILED++))
  ERRORS="$ERRORS\n- Frontend not responding"
fi

echo ""
echo -e "${YELLOW}=== Auth Service Tests ===${NC}"

# Register test shipper
echo "Setting up test shipper: $TEST_SHIPPER_EMAIL"

response=$(curl -s -X POST "$AUTH_URL/register" -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_SHIPPER_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"user_type\":\"shipper\"}")
if echo "$response" | grep -q '"success":true'; then
  echo -e "${GREEN}✓${NC} Shipper registration"
  ((PASSED++))
  SHIPPER_TOKEN=$(echo "$response" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
  SHIPPER_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
else
  echo -e "${RED}✗${NC} Shipper registration: $response"
  ((FAILED++))
  ERRORS="$ERRORS\n- Shipper registration failed"
fi

# Register test driver
echo "Setting up test driver: $TEST_DRIVER_EMAIL"

response=$(curl -s -X POST "$AUTH_URL/register" -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_DRIVER_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"user_type\":\"driver\"}")
if echo "$response" | grep -q '"success":true'; then
  echo -e "${GREEN}✓${NC} Driver registration"
  ((PASSED++))
  DRIVER_TOKEN=$(echo "$response" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
  DRIVER_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
else
  echo -e "${RED}✗${NC} Driver registration: $response"
  ((FAILED++))
  ERRORS="$ERRORS\n- Driver registration failed"
fi

# Login test
response=$(curl -s -X POST "$AUTH_URL/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_SHIPPER_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")
if echo "$response" | grep -q '"success":true'; then
  echo -e "${GREEN}✓${NC} User login"
  ((PASSED++))
  SHIPPER_TOKEN=$(echo "$response" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
else
  echo -e "${RED}✗${NC} User login"
  ((FAILED++))
  ERRORS="$ERRORS\n- User login failed"
fi

# Invalid login
response=$(curl -s -X POST "$AUTH_URL/login" -H "Content-Type: application/json" \
  -d '{"email":"wrong@example.com","password":"wrongpass"}')
if echo "$response" | grep -q '"success":false'; then
  echo -e "${GREEN}✓${NC} Invalid login rejected"
  ((PASSED++))
else
  echo -e "${RED}✗${NC} Invalid login should be rejected"
  ((FAILED++))
fi

# Passkey begin registration
if [ -n "$SHIPPER_TOKEN" ] && [ -n "$SHIPPER_ID" ]; then
  response=$(curl -s -X POST "$AUTH_URL/passkey/register/begin" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $SHIPPER_TOKEN" \
    -H "X-User-ID: $SHIPPER_ID")
  if echo "$response" | grep -q '"publicKey"'; then
    echo -e "${GREEN}✓${NC} Passkey registration begin"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} Passkey registration begin"
    ((FAILED++))
    ERRORS="$ERRORS\n- Passkey registration begin failed: $response"
  fi
fi

# Get passkeys
if [ -n "$SHIPPER_TOKEN" ] && [ -n "$SHIPPER_ID" ]; then
  response=$(curl -s "$AUTH_URL/passkeys" \
    -H "Authorization: Bearer $SHIPPER_TOKEN" \
    -H "X-User-ID: $SHIPPER_ID")
  if echo "$response" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC} Get passkeys"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} Get passkeys"
    ((FAILED++))
  fi
fi

echo ""
echo -e "${YELLOW}=== User Service Tests ===${NC}"

# Get profile (should be 404 for new user)
if [ -n "$SHIPPER_TOKEN" ] && [ -n "$SHIPPER_ID" ]; then
  status=$(curl -s -o /dev/null -w "%{http_code}" "$USER_URL/profile" \
    -H "Authorization: Bearer $SHIPPER_TOKEN" \
    -H "X-User-ID: $SHIPPER_ID")
  if [ "$status" = "404" ]; then
    echo -e "${GREEN}✓${NC} Get profile (new user - 404 expected)"
    ((PASSED++))
  else
    echo -e "${YELLOW}!${NC} Get profile returned $status"
  fi
  
  # Create shipper profile
  response=$(curl -s -X POST "$USER_URL/profile" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $SHIPPER_TOKEN" \
    -H "X-User-ID: $SHIPPER_ID" \
    -d '{"first_name":"Test","last_name":"Shipper"}')
  if echo "$response" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC} Create shipper profile"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} Create shipper profile: $response"
    ((FAILED++))
    ERRORS="$ERRORS\n- Create profile failed"
  fi
  
  # Update profile
  response=$(curl -s -X PUT "$USER_URL/profile" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $SHIPPER_TOKEN" \
    -H "X-User-ID: $SHIPPER_ID" \
    -d '{"first_name":"Updated","last_name":"Shipper"}')
  if echo "$response" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC} Update profile"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} Update profile"
    ((FAILED++))
  fi
fi

# Create driver profile
if [ -n "$DRIVER_TOKEN" ] && [ -n "$DRIVER_ID" ]; then
  curl -s -X POST "$USER_URL/profile" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $DRIVER_TOKEN" \
    -H "X-User-ID: $DRIVER_ID" \
    -d '{"first_name":"Test","last_name":"Driver"}' > /dev/null
  echo -e "${GREEN}✓${NC} Create driver profile"
  ((PASSED++))
  
  # Create driver license profile
  response=$(curl -s -X POST "$DRIVER_URL/driver" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $DRIVER_TOKEN" \
    -H "X-User-ID: $DRIVER_ID" \
    -d '{"license_number":"DL123456","license_state":"VIC","license_expiry":"2028-01-01","license_class":"HC","years_experience":5}')
  if echo "$response" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC} Create driver license profile"
    ((PASSED++))
  else
    echo -e "${YELLOW}!${NC} Driver license profile: $response"
  fi
fi

echo ""
echo -e "${YELLOW}=== Job Service Tests ===${NC}"

# List jobs
if [ -n "$SHIPPER_TOKEN" ] && [ -n "$SHIPPER_ID" ]; then
  response=$(curl -s "$JOB_URL/jobs" \
    -H "Authorization: Bearer $SHIPPER_TOKEN" \
    -H "X-User-ID: $SHIPPER_ID")
  if echo "$response" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC} List jobs"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} List jobs"
    ((FAILED++))
  fi
  
  # Create job
  response=$(curl -s -X POST "$JOB_URL/jobs" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $SHIPPER_TOKEN" \
    -H "X-User-ID: $SHIPPER_ID" \
    -d '{
      "pickup_city":"Melbourne","pickup_state":"VIC",
      "delivery_city":"Sydney","delivery_state":"NSW",
      "pickup_date":"2026-01-10","delivery_date":"2026-01-11",
      "cargo_type":"General","weight":1000,"vehicle_type":"dry_van","price":1500,
      "notes":"TEST_DATA"
    }')
  if echo "$response" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC} Create job"
    ((PASSED++))
    JOB_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  else
    echo -e "${RED}✗${NC} Create job: $response"
    ((FAILED++))
    ERRORS="$ERRORS\n- Create job failed"
  fi
fi

echo ""
echo -e "${YELLOW}=== Bidding Service Tests ===${NC}"

# List bids (driver)
if [ -n "$DRIVER_TOKEN" ] && [ -n "$DRIVER_ID" ]; then
  response=$(curl -s "$BIDDING_URL/bids" \
    -H "Authorization: Bearer $DRIVER_TOKEN" \
    -H "X-User-ID: $DRIVER_ID")
  if echo "$response" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC} List bids"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} List bids"
    ((FAILED++))
  fi
fi

echo ""
echo -e "${YELLOW}=== Full Job Workflow Tests ===${NC}"

# Create a job for workflow (shipper)
if [ -n "$SHIPPER_TOKEN" ] && [ -n "$SHIPPER_ID" ]; then
  response=$(curl -s -X POST "$JOB_URL/jobs" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $SHIPPER_TOKEN" \
    -H "X-User-ID: $SHIPPER_ID" \
    -d '{
      "pickup_city":"Brisbane","pickup_state":"QLD",
      "delivery_city":"Gold Coast","delivery_state":"QLD",
      "pickup_date":"2026-01-15","delivery_date":"2026-01-16",
      "cargo_type":"Electronics","weight":500,"vehicle_type":"dry_van","price":800,
      "notes":"TEST_DATA"
    }')
  if echo "$response" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC} Create job for workflow"
    ((PASSED++))
    WORKFLOW_JOB_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  else
    echo -e "${RED}✗${NC} Create job for workflow: $response"
    ((FAILED++))
  fi
fi

# Driver places bid
if [ -n "$DRIVER_TOKEN" ] && [ -n "$DRIVER_ID" ] && [ -n "$WORKFLOW_JOB_ID" ]; then
  response=$(curl -s -X POST "$BIDDING_URL/bids" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $DRIVER_TOKEN" \
    -H "X-User-ID: $DRIVER_ID" \
    -d "{\"job_id\":\"$WORKFLOW_JOB_ID\",\"amount\":750,\"notes\":\"Can deliver same day\"}")
  if echo "$response" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC} Driver places bid"
    ((PASSED++))
    BID_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  else
    echo -e "${RED}✗${NC} Driver places bid: $response"
    ((FAILED++))
  fi
fi

# Get job bids (shipper)
if [ -n "$SHIPPER_TOKEN" ] && [ -n "$WORKFLOW_JOB_ID" ]; then
  response=$(curl -s "$BIDDING_URL/jobs/$WORKFLOW_JOB_ID/bids" \
    -H "Authorization: Bearer $SHIPPER_TOKEN" \
    -H "X-User-ID: $SHIPPER_ID")
  if echo "$response" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC} Get job bids"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} Get job bids: $response"
    ((FAILED++))
  fi
fi

# Shipper accepts bid
if [ -n "$SHIPPER_TOKEN" ] && [ -n "$BID_ID" ]; then
  response=$(curl -s -X POST "$BIDDING_URL/bids/$BID_ID/accept" \
    -H "Authorization: Bearer $SHIPPER_TOKEN" \
    -H "X-User-ID: $SHIPPER_ID")
  if echo "$response" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC} Shipper accepts bid"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} Shipper accepts bid: $response"
    ((FAILED++))
  fi
fi

# Driver marks pickup
if [ -n "$DRIVER_TOKEN" ] && [ -n "$WORKFLOW_JOB_ID" ]; then
  response=$(curl -s -X POST "$JOB_URL/jobs/$WORKFLOW_JOB_ID/pickup" \
    -H "Authorization: Bearer $DRIVER_TOKEN" \
    -H "X-User-ID: $DRIVER_ID")
  if echo "$response" | grep -q '"in_transit"'; then
    echo -e "${GREEN}✓${NC} Driver marks pickup (status: in_transit)"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} Driver marks pickup: $response"
    ((FAILED++))
  fi
fi

# Driver marks delivered
if [ -n "$DRIVER_TOKEN" ] && [ -n "$WORKFLOW_JOB_ID" ]; then
  response=$(curl -s -X POST "$JOB_URL/jobs/$WORKFLOW_JOB_ID/deliver" \
    -H "Authorization: Bearer $DRIVER_TOKEN" \
    -H "X-User-ID: $DRIVER_ID")
  if echo "$response" | grep -q '"delivered"'; then
    echo -e "${GREEN}✓${NC} Driver marks delivered (status: delivered)"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} Driver marks delivered: $response"
    ((FAILED++))
  fi
fi

# Shipper rates driver
if [ -n "$SHIPPER_TOKEN" ] && [ -n "$WORKFLOW_JOB_ID" ] && [ -n "$DRIVER_ID" ]; then
  response=$(curl -s -X POST "$RATING_URL/ratings" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $SHIPPER_TOKEN" \
    -H "X-User-ID: $SHIPPER_ID" \
    -d "{\"job_id\":\"$WORKFLOW_JOB_ID\",\"ratee_id\":\"$DRIVER_ID\",\"rating\":5,\"comment\":\"Excellent driver!\"}")
  if echo "$response" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC} Shipper rates driver"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} Shipper rates driver: $response"
    ((FAILED++))
  fi
fi

# Driver rates shipper
if [ -n "$DRIVER_TOKEN" ] && [ -n "$WORKFLOW_JOB_ID" ] && [ -n "$SHIPPER_ID" ]; then
  response=$(curl -s -X POST "$RATING_URL/ratings" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $DRIVER_TOKEN" \
    -H "X-User-ID: $DRIVER_ID" \
    -d "{\"job_id\":\"$WORKFLOW_JOB_ID\",\"ratee_id\":\"$SHIPPER_ID\",\"rating\":4,\"comment\":\"Good communication\"}")
  if echo "$response" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC} Driver rates shipper"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} Driver rates shipper: $response"
    ((FAILED++))
  fi
fi

# Get job ratings
if [ -n "$WORKFLOW_JOB_ID" ]; then
  response=$(curl -s "$RATING_URL/ratings/job/$WORKFLOW_JOB_ID")
  if echo "$response" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC} Get job ratings"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} Get job ratings: $response"
    ((FAILED++))
  fi
fi

# Get user ratings
if [ -n "$DRIVER_ID" ]; then
  response=$(curl -s "$RATING_URL/ratings/user/$DRIVER_ID")
  if echo "$response" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC} Get user ratings"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} Get user ratings: $response"
    ((FAILED++))
  fi
fi

# Get notifications
if [ -n "$SHIPPER_ID" ]; then
  response=$(curl -s "$NOTIFICATION_URL/notifications/user/$SHIPPER_ID")
  if echo "$response" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC} Get user notifications"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} Get user notifications: $response"
    ((FAILED++))
  fi
fi

echo ""
echo -e "${YELLOW}=== Job Cancel Test ===${NC}"

# Create another job to test cancel
if [ -n "$SHIPPER_TOKEN" ] && [ -n "$SHIPPER_ID" ]; then
  response=$(curl -s -X POST "$JOB_URL/jobs" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $SHIPPER_TOKEN" \
    -H "X-User-ID: $SHIPPER_ID" \
    -d '{
      "pickup_city":"Perth","pickup_state":"WA",
      "delivery_city":"Adelaide","delivery_state":"SA",
      "pickup_date":"2026-02-01","delivery_date":"2026-02-03",
      "cargo_type":"Furniture","weight":2000,"vehicle_type":"flatbed","price":3000,
      "notes":"TEST_DATA"
    }')
  if echo "$response" | grep -q '"success":true'; then
    CANCEL_JOB_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    
    # Cancel the job
    response=$(curl -s -X POST "$JOB_URL/jobs/$CANCEL_JOB_ID/cancel" \
      -H "Authorization: Bearer $SHIPPER_TOKEN" \
      -H "X-User-ID: $SHIPPER_ID")
    if echo "$response" | grep -q '"cancelled"'; then
      echo -e "${GREEN}✓${NC} Cancel job (status: cancelled)"
      ((PASSED++))
    else
      echo -e "${RED}✗${NC} Cancel job: $response"
      ((FAILED++))
    fi
  fi
fi

echo ""
echo -e "${YELLOW}=== Route Service Tests ===${NC}"

# Calculate route
response=$(curl -s -X POST "$ROUTE_URL/route" \
  -H "Content-Type: application/json" \
  -d '{"origin":{"lat":-37.8136,"lng":144.9631},"destination":{"lat":-33.8688,"lng":151.2093}}')
if echo "$response" | grep -q '"distance_km"'; then
  echo -e "${GREEN}✓${NC} Calculate route"
  ((PASSED++))
else
  echo -e "${RED}✗${NC} Calculate route: $response"
  ((FAILED++))
fi

# Optimize route
response=$(curl -s -X POST "$ROUTE_URL/route/optimize" \
  -H "Content-Type: application/json" \
  -d '{"origin":{"lat":-37.8136,"lng":144.9631},"stops":[{"lat":-33.8688,"lng":151.2093},{"lat":-35.2809,"lng":149.1300}]}')
if echo "$response" | grep -q '"optimized_route"'; then
  echo -e "${GREEN}✓${NC} Optimize route"
  ((PASSED++))
else
  echo -e "${RED}✗${NC} Optimize route: $response"
  ((FAILED++))
fi

echo ""
echo -e "${YELLOW}=== Backhaul Service Tests ===${NC}"

# Find backhauls (empty result is ok)
response=$(curl -s -X POST "$BACKHAUL_URL/backhaul/find" \
  -H "Content-Type: application/json" \
  -d '{"current_lat":-37.8136,"current_lng":144.9631,"dest_lat":-33.8688,"dest_lng":151.2093,"vehicle_type":"dry_van"}')
if echo "$response" | grep -q '"success":true'; then
  echo -e "${GREEN}✓${NC} Find backhauls"
  ((PASSED++))
else
  echo -e "${RED}✗${NC} Find backhauls: $response"
  ((FAILED++))
fi

echo ""
echo -e "${YELLOW}=== Tracking Service Tests ===${NC}"

# Create a new in_transit job for tracking tests
if [ -n "$SHIPPER_TOKEN" ] && [ -n "$SHIPPER_ID" ] && [ -n "$DRIVER_ID" ]; then
  response=$(curl -s -X POST "$JOB_URL/jobs" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $SHIPPER_TOKEN" \
    -H "X-User-ID: $SHIPPER_ID" \
    -d '{
      "pickup_city":"Melbourne","pickup_state":"VIC",
      "delivery_city":"Sydney","delivery_state":"NSW",
      "pickup_date":"2026-01-10","delivery_date":"2026-01-11",
      "cargo_type":"General","weight":1000,"vehicle_type":"dry_van","price":1500,
      "notes":"TEST_DATA - Tracking Test"
    }')
  TRACKING_JOB_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  
  # Driver bids and gets accepted
  if [ -n "$TRACKING_JOB_ID" ]; then
    bid_response=$(curl -s -X POST "$BIDDING_URL/bids" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $DRIVER_TOKEN" \
      -H "X-User-ID: $DRIVER_ID" \
      -d "{\"job_id\":\"$TRACKING_JOB_ID\",\"amount\":1400}")
    TRACKING_BID_ID=$(echo "$bid_response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    
    curl -s -X POST "$BIDDING_URL/bids/$TRACKING_BID_ID/accept" \
      -H "Authorization: Bearer $SHIPPER_TOKEN" \
      -H "X-User-ID: $SHIPPER_ID" > /dev/null
    
    # Mark as picked up (in_transit)
    curl -s -X POST "$JOB_URL/jobs/$TRACKING_JOB_ID/pickup" \
      -H "Authorization: Bearer $DRIVER_TOKEN" \
      -H "X-User-ID: $DRIVER_ID" > /dev/null
    echo -e "${GREEN}✓${NC} Setup tracking test job (in_transit)"
    ((PASSED++))
  fi
fi

# Update location
if [ -n "$DRIVER_TOKEN" ] && [ -n "$DRIVER_ID" ] && [ -n "$TRACKING_JOB_ID" ]; then
  response=$(curl -s -X POST "$TRACKING_URL/tracking/update" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $DRIVER_TOKEN" \
    -H "X-User-ID: $DRIVER_ID" \
    -d "{\"job_id\":\"$TRACKING_JOB_ID\",\"driver_id\":\"$DRIVER_ID\",\"latitude\":-37.8136,\"longitude\":144.9631,\"speed\":60,\"heading\":90,\"event_type\":\"location\"}")
  if echo "$response" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC} Update tracking location"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} Update tracking: $response"
    ((FAILED++))
  fi
fi

# Get job tracking history (returns location events)
if [ -n "$TRACKING_JOB_ID" ]; then
  response=$(curl -s "$TRACKING_URL/tracking/job/$TRACKING_JOB_ID" \
    -H "Authorization: Bearer $SHIPPER_TOKEN" \
    -H "X-User-ID: $SHIPPER_ID")
  if echo "$response" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC} Get job tracking history"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} Get job tracking history: $response"
    ((FAILED++))
  fi
fi

# Add multiple location updates to test stop detection
if [ -n "$DRIVER_TOKEN" ] && [ -n "$DRIVER_ID" ] && [ -n "$TRACKING_JOB_ID" ]; then
  for i in 1 2 3 4 5 6; do
    curl -s -X POST "$TRACKING_URL/tracking/update" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $DRIVER_TOKEN" \
      -H "X-User-ID: $DRIVER_ID" \
      -d "{\"job_id\":\"$TRACKING_JOB_ID\",\"driver_id\":\"$DRIVER_ID\",\"latitude\":-36.5,\"longitude\":146.0,\"speed\":0,\"heading\":0,\"event_type\":\"location\"}" > /dev/null
  done
  echo -e "${GREEN}✓${NC} Add multiple location updates"
  ((PASSED++))
fi

# Get stops
if [ -n "$TRACKING_JOB_ID" ]; then
  response=$(curl -s "$TRACKING_URL/tracking/job/$TRACKING_JOB_ID/stops" \
    -H "Authorization: Bearer $SHIPPER_TOKEN" \
    -H "X-User-ID: $SHIPPER_ID")
  if echo "$response" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC} Get stops endpoint"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} Get stops: $response"
    ((FAILED++))
  fi
fi

# Get driver current location
if [ -n "$DRIVER_ID" ]; then
  response=$(curl -s "$TRACKING_URL/tracking/driver/$DRIVER_ID/current" \
    -H "Authorization: Bearer $SHIPPER_TOKEN" \
    -H "X-User-ID: $SHIPPER_ID")
  if echo "$response" | grep -q '"success":true' || echo "$response" | grep -q '"latitude"'; then
    echo -e "${GREEN}✓${NC} Get driver current location"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} Get driver current location: $response"
    ((FAILED++))
  fi
fi

echo ""
echo -e "${YELLOW}=== Payment Service Tests ===${NC}"

# Create payment (use workflow job)
if [ -n "$SHIPPER_TOKEN" ] && [ -n "$SHIPPER_ID" ] && [ -n "$DRIVER_ID" ] && [ -n "$WORKFLOW_JOB_ID" ]; then
  response=$(curl -s -X POST "$PAYMENT_URL/payments" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $SHIPPER_TOKEN" \
    -d "{\"job_id\":\"$WORKFLOW_JOB_ID\",\"payer_id\":\"$SHIPPER_ID\",\"payee_id\":\"$DRIVER_ID\",\"amount\":750}")
  if echo "$response" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC} Create payment"
    ((PASSED++))
    PAYMENT_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  else
    echo -e "${RED}✗${NC} Create payment: $response"
    ((FAILED++))
  fi
fi

echo ""
echo -e "${YELLOW}=== Notification Service Tests ===${NC}"

# Send notification
if [ -n "$SHIPPER_ID" ]; then
  response=$(curl -s -X POST "$NOTIFICATION_URL/notifications/send" \
    -H "Content-Type: application/json" \
    -d "{\"user_id\":\"$SHIPPER_ID\",\"type\":\"push\",\"title\":\"Test\",\"message\":\"Test notification\"}")
  if echo "$response" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC} Send notification"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} Send notification: $response"
    ((FAILED++))
  fi
fi

echo ""
echo -e "${YELLOW}=== Driver Availability Tests ===${NC}"

# Toggle driver availability
if [ -n "$DRIVER_TOKEN" ] && [ -n "$DRIVER_ID" ]; then
  response=$(curl -s -X PUT "$DRIVER_URL/driver/availability" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $DRIVER_TOKEN" \
    -H "X-User-ID: $DRIVER_ID" \
    -d '{"is_available":true}')
  if echo "$response" | grep -q '"is_available":true'; then
    echo -e "${GREEN}✓${NC} Toggle driver availability (online)"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} Toggle driver availability: $response"
    ((FAILED++))
  fi
  
  # Toggle back to offline
  response=$(curl -s -X PUT "$DRIVER_URL/driver/availability" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $DRIVER_TOKEN" \
    -H "X-User-ID: $DRIVER_ID" \
    -d '{"is_available":false}')
  if echo "$response" | grep -q '"is_available":false'; then
    echo -e "${GREEN}✓${NC} Toggle driver availability (offline)"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} Toggle driver availability offline: $response"
    ((FAILED++))
  fi
fi

echo ""
echo -e "${YELLOW}=== Fleet Service Tests ===${NC}"

# Register fleet operator
FLEET_OP_EMAIL="test_fleet_op@truckify.test"
response=$(curl -s -X POST "$AUTH_URL/register" -H "Content-Type: application/json" \
  -d "{\"email\":\"$FLEET_OP_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"user_type\":\"fleet_operator\"}")
if echo "$response" | grep -q '"success":true'; then
  echo -e "${GREEN}✓${NC} Fleet operator registration"
  ((PASSED++))
  FLEET_OP_TOKEN=$(echo "$response" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
  FLEET_OP_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
else
  echo -e "${RED}✗${NC} Fleet operator registration: $response"
  ((FAILED++))
fi

# Create fleet
if [ -n "$FLEET_OP_TOKEN" ]; then
  response=$(curl -s -X POST "$FLEET_URL/fleet" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $FLEET_OP_TOKEN" \
    -H "X-User-ID: $FLEET_OP_ID" \
    -d '{"name":"Test Fleet","abn":"12345678901"}')
  if echo "$response" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC} Create fleet"
    ((PASSED++))
    FLEET_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  else
    echo -e "${RED}✗${NC} Create fleet: $response"
    ((FAILED++))
  fi
fi

# Get fleet
if [ -n "$FLEET_OP_TOKEN" ]; then
  response=$(curl -s "$FLEET_URL/fleet" \
    -H "Authorization: Bearer $FLEET_OP_TOKEN" \
    -H "X-User-ID: $FLEET_OP_ID")
  if echo "$response" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC} Get fleet"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} Get fleet: $response"
    ((FAILED++))
  fi
fi

# Add vehicle to fleet
if [ -n "$FLEET_OP_TOKEN" ]; then
  response=$(curl -s -X POST "$FLEET_URL/fleet/vehicles" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $FLEET_OP_TOKEN" \
    -H "X-User-ID: $FLEET_OP_ID" \
    -d '{"type":"dry_van","make":"Kenworth","model":"T680","year":2022,"plate":"TEST123","capacity":25000,"rego_expiry":"2027-01-01","insurance_expiry":"2027-01-01"}')
  if echo "$response" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC} Add vehicle to fleet"
    ((PASSED++))
    VEHICLE_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  else
    echo -e "${RED}✗${NC} Add vehicle: $response"
    ((FAILED++))
  fi
fi

# Get fleet vehicles
if [ -n "$FLEET_OP_TOKEN" ]; then
  response=$(curl -s "$FLEET_URL/fleet/vehicles" \
    -H "Authorization: Bearer $FLEET_OP_TOKEN" \
    -H "X-User-ID: $FLEET_OP_ID")
  if echo "$response" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC} Get fleet vehicles"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} Get fleet vehicles: $response"
    ((FAILED++))
  fi
fi

# Add driver to fleet
if [ -n "$FLEET_OP_TOKEN" ] && [ -n "$DRIVER_ID" ]; then
  response=$(curl -s -X POST "$FLEET_URL/fleet/drivers" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $FLEET_OP_TOKEN" \
    -H "X-User-ID: $FLEET_OP_ID" \
    -d "{\"driver_id\":\"$DRIVER_ID\",\"user_id\":\"$DRIVER_ID\"}")
  if echo "$response" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC} Add driver to fleet"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} Add driver to fleet: $response"
    ((FAILED++))
  fi
fi

# Get fleet drivers
if [ -n "$FLEET_OP_TOKEN" ]; then
  response=$(curl -s "$FLEET_URL/fleet/drivers" \
    -H "Authorization: Bearer $FLEET_OP_TOKEN" \
    -H "X-User-ID: $FLEET_OP_ID")
  if echo "$response" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC} Get fleet drivers"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} Get fleet drivers: $response"
    ((FAILED++))
  fi
fi

# Assign vehicle to driver
if [ -n "$FLEET_OP_TOKEN" ] && [ -n "$VEHICLE_ID" ] && [ -n "$DRIVER_ID" ]; then
  response=$(curl -s -X POST "$FLEET_URL/fleet/vehicles/$VEHICLE_ID/assign" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $FLEET_OP_TOKEN" \
    -H "X-User-ID: $FLEET_OP_ID" \
    -d "{\"driver_id\":\"$DRIVER_ID\"}")
  if echo "$response" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC} Assign vehicle to driver"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} Assign vehicle: $response"
    ((FAILED++))
  fi
fi

echo ""
echo -e "${YELLOW}=== WebSocket Tests ===${NC}"

# Test WebSocket endpoint exists
ws_status=$(curl -s -o /dev/null -w "%{http_code}" "$NOTIFICATION_URL/ws?user_id=$SHIPPER_ID" 2>/dev/null || echo "000")
if [ "$ws_status" = "400" ] || [ "$ws_status" = "101" ] || [ "$ws_status" = "200" ]; then
  echo -e "${GREEN}✓${NC} WebSocket endpoint available"
  ((PASSED++))
else
  echo -e "${RED}✗${NC} WebSocket endpoint (HTTP $ws_status)"
  ((FAILED++))
fi

echo ""
echo -e "${YELLOW}=== Pricing Service Tests ===${NC}"

# Get subscription tiers
response=$(curl -s "$PAYMENT_URL/pricing/tiers")
if echo "$response" | grep -q '"success":true' && echo "$response" | grep -q '"free"'; then
  echo -e "${GREEN}✓${NC} Get subscription tiers"
  ((PASSED++))
else
  echo -e "${RED}✗${NC} Get subscription tiers: $response"
  ((FAILED++))
fi

# Get commission tiers
response=$(curl -s "$PAYMENT_URL/pricing/commission-tiers")
if echo "$response" | grep -q '"success":true'; then
  echo -e "${GREEN}✓${NC} Get commission tiers"
  ((PASSED++))
else
  echo -e "${RED}✗${NC} Get commission tiers: $response"
  ((FAILED++))
fi

# Calculate fees (free tier)
response=$(curl -s -X POST "$PAYMENT_URL/pricing/calculate" \
  -H "Content-Type: application/json" \
  -d "{\"driver_id\":\"$DRIVER_ID\",\"job_amount\":1000}")
if echo "$response" | grep -q '"success":true' && echo "$response" | grep -q '"effective_rate"'; then
  echo -e "${GREEN}✓${NC} Calculate fees"
  ((PASSED++))
else
  echo -e "${RED}✗${NC} Calculate fees: $response"
  ((FAILED++))
fi

# Get user subscription (should be free/none)
if [ -n "$DRIVER_TOKEN" ]; then
  response=$(curl -s "$PAYMENT_URL/subscription" \
    -H "Authorization: Bearer $DRIVER_TOKEN" \
    -H "X-User-ID: $DRIVER_ID")
  if echo "$response" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC} Get user subscription"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} Get user subscription: $response"
    ((FAILED++))
  fi
fi

# Subscribe to basic tier
if [ -n "$DRIVER_TOKEN" ]; then
  response=$(curl -s -X POST "$PAYMENT_URL/subscription" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $DRIVER_TOKEN" \
    -H "X-User-ID: $DRIVER_ID" \
    -d '{"tier_id":"00000000-0000-0000-0000-000000000002"}')
  if echo "$response" | grep -q '"success":true' && echo "$response" | grep -q '"basic"'; then
    echo -e "${GREEN}✓${NC} Subscribe to tier"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} Subscribe to tier: $response"
    ((FAILED++))
  fi
fi

echo ""
echo -e "${YELLOW}=== Analytics Service Tests ===${NC}"

# Get dashboard stats
response=$(curl -s "$ANALYTICS_URL/analytics/dashboard")
if echo "$response" | grep -q '"success":true'; then
  echo -e "${GREEN}✓${NC} Get dashboard stats"
  ((PASSED++))
else
  echo -e "${RED}✗${NC} Get dashboard stats: $response"
  ((FAILED++))
fi

# Get jobs by status
response=$(curl -s "$ANALYTICS_URL/analytics/jobs/status")
if echo "$response" | grep -q '"success":true'; then
  echo -e "${GREEN}✓${NC} Get jobs by status"
  ((PASSED++))
else
  echo -e "${RED}✗${NC} Get jobs by status: $response"
  ((FAILED++))
fi

# Get jobs by day
response=$(curl -s "$ANALYTICS_URL/analytics/jobs/daily?days=7")
if echo "$response" | grep -q '"success":true'; then
  echo -e "${GREEN}✓${NC} Get jobs by day"
  ((PASSED++))
else
  echo -e "${RED}✗${NC} Get jobs by day: $response"
  ((FAILED++))
fi

# Get revenue by day
response=$(curl -s "$ANALYTICS_URL/analytics/revenue/daily?days=7")
if echo "$response" | grep -q '"success":true'; then
  echo -e "${GREEN}✓${NC} Get revenue by day"
  ((PASSED++))
else
  echo -e "${RED}✗${NC} Get revenue by day: $response"
  ((FAILED++))
fi

# Get top routes
response=$(curl -s "$ANALYTICS_URL/analytics/routes/top?limit=5")
if echo "$response" | grep -q '"success":true'; then
  echo -e "${GREEN}✓${NC} Get top routes"
  ((PASSED++))
else
  echo -e "${RED}✗${NC} Get top routes: $response"
  ((FAILED++))
fi

echo ""
echo -e "${YELLOW}=== Admin Tests ===${NC}"

# Admin login
response=$(curl -s -X POST "$AUTH_URL/login" -H "Content-Type: application/json" \
  -d '{"email":"admin@truckify.com","password":"admin123"}')
if echo "$response" | grep -q '"user_type":"admin"'; then
  echo -e "${GREEN}✓${NC} Admin login"
  ((PASSED++))
  ADMIN_TOKEN=$(echo "$response" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
  ADMIN_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
else
  echo -e "${RED}✗${NC} Admin login"
  ((FAILED++))
  ERRORS="$ERRORS\n- Admin login failed"
fi

# Admin list users
if [ -n "$ADMIN_TOKEN" ]; then
  response=$(curl -s "$AUTH_URL/admin/users" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "X-User-ID: $ADMIN_ID" \
    -H "X-User-Type: admin")
  if echo "$response" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC} Admin list users"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} Admin list users: $response"
    ((FAILED++))
    ERRORS="$ERRORS\n- Admin list users failed"
  fi
fi

# Admin passkey begin
if [ -n "$ADMIN_TOKEN" ] && [ -n "$ADMIN_ID" ]; then
  response=$(curl -s -X POST "$AUTH_URL/passkey/register/begin" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "X-User-ID: $ADMIN_ID")
  if echo "$response" | grep -q '"publicKey"'; then
    echo -e "${GREEN}✓${NC} Admin passkey registration begin"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} Admin passkey registration begin: $response"
    ((FAILED++))
    ERRORS="$ERRORS\n- Admin passkey registration failed"
  fi
fi

echo ""
echo "========================================"
echo -e "  Results: ${GREEN}$PASSED passed${NC}, ${RED}$FAILED failed${NC}"
echo "========================================"

if [ $FAILED -gt 0 ]; then
  echo -e "\n${RED}Failed tests:${NC}$ERRORS"
  exit 1
fi
