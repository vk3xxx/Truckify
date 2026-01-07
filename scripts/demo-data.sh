#!/bin/bash
# Truckify Demo Data Loader
# Usage: ./demo-data.sh load | unload

set -e

BASE_URL="http://localhost"
AUTH_URL="$BASE_URL:8001"
USER_URL="$BASE_URL:8002"
DRIVER_URL="$BASE_URL:8004"
FLEET_URL="$BASE_URL:8005"
JOB_URL="$BASE_URL:8006"
BIDDING_URL="$BASE_URL:8008"
TRACKING_URL="$BASE_URL:8011"
PAYMENT_URL="$BASE_URL:8012"
RATING_URL="$BASE_URL:8013"
NOTIFICATION_URL="$BASE_URL:8014"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Demo user credentials
DEMO_PASSWORD="Demo123!"

unload_data() {
  echo -e "${YELLOW}Unloading demo data...${NC}"
  
  docker exec truckify-postgres psql -U truckify -d auth -c "
    DELETE FROM users WHERE email LIKE 'demo_%@truckify.demo';
  " > /dev/null 2>&1 || true
  
  docker exec truckify-postgres psql -U truckify -d job -c "TRUNCATE jobs CASCADE;" > /dev/null 2>&1 || true
  docker exec truckify-postgres psql -U truckify -d bidding -c "TRUNCATE bids CASCADE;" > /dev/null 2>&1 || true
  docker exec truckify-postgres psql -U truckify -d rating -c "TRUNCATE ratings CASCADE;" > /dev/null 2>&1 || true
  docker exec truckify-postgres psql -U truckify -d tracking -c "TRUNCATE tracking_events CASCADE;" > /dev/null 2>&1 || true
  docker exec truckify-postgres psql -U truckify -d payment -c "TRUNCATE payments CASCADE;" > /dev/null 2>&1 || true
  docker exec truckify-postgres psql -U truckify -d payment -c "DELETE FROM subscriptions WHERE user_id IN (SELECT id FROM auth.public.users WHERE email LIKE 'demo_%@truckify.demo');" > /dev/null 2>&1 || true
  docker exec truckify-postgres psql -U truckify -d fleet -c "TRUNCATE vehicle_handovers, fleet_drivers, fleet_vehicles, fleets CASCADE;" > /dev/null 2>&1 || true
  docker exec truckify-postgres psql -U truckify -d driver -c "TRUNCATE vehicles, drivers CASCADE;" > /dev/null 2>&1 || true
  docker exec truckify-postgres psql -U truckify -d "user" -c "TRUNCATE profiles CASCADE;" > /dev/null 2>&1 || true
  
  echo -e "${GREEN}✓ Demo data unloaded${NC}"
}

load_data() {
  echo -e "${YELLOW}Loading demo data...${NC}"
  
  # First unload any existing demo data
  unload_data
  
  echo ""
  echo "Creating users..."
  
  # Create Shippers
  for i in 1 2 3; do
    response=$(curl -s -X POST "$AUTH_URL/register" -H "Content-Type: application/json" \
      -d "{\"email\":\"demo_shipper${i}@truckify.demo\",\"password\":\"$DEMO_PASSWORD\",\"user_type\":\"shipper\"}")
    eval "SHIPPER${i}_ID=\$(echo \"\$response\" | grep -o '\"id\":\"[^\"]*\"' | head -1 | cut -d'\"' -f4)"
    eval "SHIPPER${i}_TOKEN=\$(echo \"\$response\" | grep -o '\"access_token\":\"[^\"]*\"' | cut -d'\"' -f4)"
  done
  echo -e "${GREEN}✓ Created 3 shippers${NC}"
  
  # Create Drivers
  for i in 1 2 3 4 5; do
    response=$(curl -s -X POST "$AUTH_URL/register" -H "Content-Type: application/json" \
      -d "{\"email\":\"demo_driver${i}@truckify.demo\",\"password\":\"$DEMO_PASSWORD\",\"user_type\":\"driver\"}")
    eval "DRIVER${i}_ID=\$(echo \"\$response\" | grep -o '\"id\":\"[^\"]*\"' | head -1 | cut -d'\"' -f4)"
    eval "DRIVER${i}_TOKEN=\$(echo \"\$response\" | grep -o '\"access_token\":\"[^\"]*\"' | cut -d'\"' -f4)"
  done
  echo -e "${GREEN}✓ Created 5 drivers${NC}"
  
  # Create Fleet Operator
  response=$(curl -s -X POST "$AUTH_URL/register" -H "Content-Type: application/json" \
    -d "{\"email\":\"demo_fleet@truckify.demo\",\"password\":\"$DEMO_PASSWORD\",\"user_type\":\"fleet_operator\"}")
  FLEET_OP_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  FLEET_OP_TOKEN=$(echo "$response" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
  echo -e "${GREEN}✓ Created fleet operator${NC}"

  echo ""
  echo "Creating profiles..."
  
  # Shipper profiles
  curl -s -X POST "$USER_URL/profile" -H "Content-Type: application/json" -H "Authorization: Bearer $SHIPPER1_TOKEN" -H "X-User-ID: $SHIPPER1_ID" \
    -d '{"first_name":"Sarah","last_name":"Mitchell"}' > /dev/null
  curl -s -X POST "$USER_URL/profile" -H "Content-Type: application/json" -H "Authorization: Bearer $SHIPPER2_TOKEN" -H "X-User-ID: $SHIPPER2_ID" \
    -d '{"first_name":"James","last_name":"Wilson"}' > /dev/null
  curl -s -X POST "$USER_URL/profile" -H "Content-Type: application/json" -H "Authorization: Bearer $SHIPPER3_TOKEN" -H "X-User-ID: $SHIPPER3_ID" \
    -d '{"first_name":"Emma","last_name":"Thompson"}' > /dev/null
  
  # Driver profiles
  curl -s -X POST "$USER_URL/profile" -H "Content-Type: application/json" -H "Authorization: Bearer $DRIVER1_TOKEN" -H "X-User-ID: $DRIVER1_ID" \
    -d '{"first_name":"Mike","last_name":"Johnson"}' > /dev/null
  curl -s -X POST "$USER_URL/profile" -H "Content-Type: application/json" -H "Authorization: Bearer $DRIVER2_TOKEN" -H "X-User-ID: $DRIVER2_ID" \
    -d '{"first_name":"David","last_name":"Chen"}' > /dev/null
  curl -s -X POST "$USER_URL/profile" -H "Content-Type: application/json" -H "Authorization: Bearer $DRIVER3_TOKEN" -H "X-User-ID: $DRIVER3_ID" \
    -d '{"first_name":"Lisa","last_name":"Anderson"}' > /dev/null
  curl -s -X POST "$USER_URL/profile" -H "Content-Type: application/json" -H "Authorization: Bearer $DRIVER4_TOKEN" -H "X-User-ID: $DRIVER4_ID" \
    -d '{"first_name":"Tom","last_name":"Brown"}' > /dev/null
  curl -s -X POST "$USER_URL/profile" -H "Content-Type: application/json" -H "Authorization: Bearer $DRIVER5_TOKEN" -H "X-User-ID: $DRIVER5_ID" \
    -d '{"first_name":"Rachel","last_name":"Garcia"}' > /dev/null
    
  # Fleet operator profile
  curl -s -X POST "$USER_URL/profile" -H "Content-Type: application/json" -H "Authorization: Bearer $FLEET_OP_TOKEN" -H "X-User-ID: $FLEET_OP_ID" \
    -d '{"first_name":"Robert","last_name":"Fleet"}' > /dev/null
  echo -e "${GREEN}✓ Created profiles${NC}"

  echo ""
  echo "Creating driver licenses..."
  
  curl -s -X POST "$DRIVER_URL/driver" -H "Content-Type: application/json" -H "Authorization: Bearer $DRIVER1_TOKEN" -H "X-User-ID: $DRIVER1_ID" \
    -d '{"license_number":"DL001234","license_state":"VIC","license_expiry":"2028-06-15","license_class":"HC","years_experience":8}' > /dev/null
  curl -s -X POST "$DRIVER_URL/driver" -H "Content-Type: application/json" -H "Authorization: Bearer $DRIVER2_TOKEN" -H "X-User-ID: $DRIVER2_ID" \
    -d '{"license_number":"DL002345","license_state":"NSW","license_expiry":"2027-09-20","license_class":"HC","years_experience":5}' > /dev/null
  curl -s -X POST "$DRIVER_URL/driver" -H "Content-Type: application/json" -H "Authorization: Bearer $DRIVER3_TOKEN" -H "X-User-ID: $DRIVER3_ID" \
    -d '{"license_number":"DL003456","license_state":"QLD","license_expiry":"2028-03-10","license_class":"MC","years_experience":12}' > /dev/null
  curl -s -X POST "$DRIVER_URL/driver" -H "Content-Type: application/json" -H "Authorization: Bearer $DRIVER4_TOKEN" -H "X-User-ID: $DRIVER4_ID" \
    -d '{"license_number":"DL004567","license_state":"SA","license_expiry":"2027-12-01","license_class":"HC","years_experience":3}' > /dev/null
  curl -s -X POST "$DRIVER_URL/driver" -H "Content-Type: application/json" -H "Authorization: Bearer $DRIVER5_TOKEN" -H "X-User-ID: $DRIVER5_ID" \
    -d '{"license_number":"DL005678","license_state":"WA","license_expiry":"2028-08-25","license_class":"MC","years_experience":7}' > /dev/null
  echo -e "${GREEN}✓ Created driver licenses${NC}"

  # Set some drivers as available
  curl -s -X PUT "$DRIVER_URL/driver/availability" -H "Content-Type: application/json" -H "Authorization: Bearer $DRIVER1_TOKEN" -H "X-User-ID: $DRIVER1_ID" \
    -d '{"is_available":true}' > /dev/null
  curl -s -X PUT "$DRIVER_URL/driver/availability" -H "Content-Type: application/json" -H "Authorization: Bearer $DRIVER2_TOKEN" -H "X-User-ID: $DRIVER2_ID" \
    -d '{"is_available":true}' > /dev/null
  curl -s -X PUT "$DRIVER_URL/driver/availability" -H "Content-Type: application/json" -H "Authorization: Bearer $DRIVER3_TOKEN" -H "X-User-ID: $DRIVER3_ID" \
    -d '{"is_available":true}' > /dev/null

  # Subscribe driver1 to Pro tier
  curl -s -X POST "$PAYMENT_URL/subscription" -H "Content-Type: application/json" -H "Authorization: Bearer $DRIVER1_TOKEN" -H "X-User-ID: $DRIVER1_ID" \
    -d '{"tier_id":"00000000-0000-0000-0000-000000000003"}' > /dev/null
  echo -e "${GREEN}✓ Set driver availability and subscriptions${NC}"

  echo ""
  echo "Creating fleet..."
  
  # Create fleet
  response=$(curl -s -X POST "$FLEET_URL/fleet" -H "Content-Type: application/json" -H "Authorization: Bearer $FLEET_OP_TOKEN" -H "X-User-ID: $FLEET_OP_ID" \
    -d '{"name":"Demo Transport Co","abn":"12345678901"}')
  FLEET_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  
  # Add vehicles to fleet
  curl -s -X POST "$FLEET_URL/fleet/vehicles" -H "Content-Type: application/json" -H "Authorization: Bearer $FLEET_OP_TOKEN" -H "X-User-ID: $FLEET_OP_ID" \
    -d '{"type":"dry_van","make":"Kenworth","model":"T680","year":2022,"plate":"DEMO01","capacity":25000,"rego_expiry":"2027-06-01","insurance_expiry":"2027-06-01"}' > /dev/null
  curl -s -X POST "$FLEET_URL/fleet/vehicles" -H "Content-Type: application/json" -H "Authorization: Bearer $FLEET_OP_TOKEN" -H "X-User-ID: $FLEET_OP_ID" \
    -d '{"type":"refrigerated","make":"Volvo","model":"VNL","year":2023,"plate":"DEMO02","capacity":22000,"rego_expiry":"2027-09-15","insurance_expiry":"2027-09-15"}' > /dev/null
  curl -s -X POST "$FLEET_URL/fleet/vehicles" -H "Content-Type: application/json" -H "Authorization: Bearer $FLEET_OP_TOKEN" -H "X-User-ID: $FLEET_OP_ID" \
    -d '{"type":"flatbed","make":"Freightliner","model":"Cascadia","year":2021,"plate":"DEMO03","capacity":28000,"rego_expiry":"2027-03-20","insurance_expiry":"2027-03-20"}' > /dev/null
  echo -e "${GREEN}✓ Created fleet with 3 vehicles${NC}"

  echo ""
  echo "Creating jobs..."
  
  # Create various jobs with different statuses
  # Pending jobs (available for bidding)
  response=$(curl -s -X POST "$JOB_URL/jobs" -H "Content-Type: application/json" -H "Authorization: Bearer $SHIPPER1_TOKEN" -H "X-User-ID: $SHIPPER1_ID" \
    -d '{"pickup_city":"Melbourne","pickup_state":"VIC","delivery_city":"Sydney","delivery_state":"NSW","pickup_date":"2026-01-10","delivery_date":"2026-01-11","cargo_type":"Electronics","weight":5000,"vehicle_type":"dry_van","price":2500,"notes":"Fragile electronics - handle with care"}')
  JOB1_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  
  response=$(curl -s -X POST "$JOB_URL/jobs" -H "Content-Type: application/json" -H "Authorization: Bearer $SHIPPER1_TOKEN" -H "X-User-ID: $SHIPPER1_ID" \
    -d '{"pickup_city":"Brisbane","pickup_state":"QLD","delivery_city":"Gold Coast","delivery_state":"QLD","pickup_date":"2026-01-12","delivery_date":"2026-01-12","cargo_type":"Furniture","weight":3000,"vehicle_type":"flatbed","price":800,"notes":"Outdoor furniture set"}')
  JOB2_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  
  response=$(curl -s -X POST "$JOB_URL/jobs" -H "Content-Type: application/json" -H "Authorization: Bearer $SHIPPER2_TOKEN" -H "X-User-ID: $SHIPPER2_ID" \
    -d '{"pickup_city":"Adelaide","pickup_state":"SA","delivery_city":"Perth","delivery_state":"WA","pickup_date":"2026-01-15","delivery_date":"2026-01-18","cargo_type":"Machinery","weight":15000,"vehicle_type":"flatbed","price":5500,"notes":"Heavy machinery - requires crane for unloading"}')
  JOB3_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  
  response=$(curl -s -X POST "$JOB_URL/jobs" -H "Content-Type: application/json" -H "Authorization: Bearer $SHIPPER2_TOKEN" -H "X-User-ID: $SHIPPER2_ID" \
    -d '{"pickup_city":"Sydney","pickup_state":"NSW","delivery_city":"Canberra","delivery_state":"ACT","pickup_date":"2026-01-08","delivery_date":"2026-01-08","cargo_type":"Documents","weight":500,"vehicle_type":"dry_van","price":450,"notes":"Confidential documents"}')
  JOB4_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  
  response=$(curl -s -X POST "$JOB_URL/jobs" -H "Content-Type: application/json" -H "Authorization: Bearer $SHIPPER3_TOKEN" -H "X-User-ID: $SHIPPER3_ID" \
    -d '{"pickup_city":"Darwin","pickup_state":"NT","delivery_city":"Alice Springs","delivery_state":"NT","pickup_date":"2026-01-20","delivery_date":"2026-01-21","cargo_type":"Food Products","weight":8000,"vehicle_type":"refrigerated","price":3200,"notes":"Temperature controlled - keep at 4°C"}')
  JOB5_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo -e "${GREEN}✓ Created 5 pending jobs${NC}"

  echo ""
  echo "Creating bids..."
  
  # Bids on jobs
  response=$(curl -s -X POST "$BIDDING_URL/bids" -H "Content-Type: application/json" -H "Authorization: Bearer $DRIVER1_TOKEN" -H "X-User-ID: $DRIVER1_ID" \
    -d "{\"job_id\":\"$JOB1_ID\",\"amount\":2300,\"notes\":\"Experienced with electronics, have blankets\"}")
  BID1_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  
  curl -s -X POST "$BIDDING_URL/bids" -H "Content-Type: application/json" -H "Authorization: Bearer $DRIVER2_TOKEN" -H "X-User-ID: $DRIVER2_ID" \
    -d "{\"job_id\":\"$JOB1_ID\",\"amount\":2400,\"notes\":\"Can deliver same day\"}" > /dev/null
  
  curl -s -X POST "$BIDDING_URL/bids" -H "Content-Type: application/json" -H "Authorization: Bearer $DRIVER3_TOKEN" -H "X-User-ID: $DRIVER3_ID" \
    -d "{\"job_id\":\"$JOB2_ID\",\"amount\":750,\"notes\":\"Local driver, know the area well\"}" > /dev/null
  
  curl -s -X POST "$BIDDING_URL/bids" -H "Content-Type: application/json" -H "Authorization: Bearer $DRIVER4_TOKEN" -H "X-User-ID: $DRIVER4_ID" \
    -d "{\"job_id\":\"$JOB3_ID\",\"amount\":5200,\"notes\":\"Have done this route many times\"}" > /dev/null
  
  curl -s -X POST "$BIDDING_URL/bids" -H "Content-Type: application/json" -H "Authorization: Bearer $DRIVER5_TOKEN" -H "X-User-ID: $DRIVER5_ID" \
    -d "{\"job_id\":\"$JOB5_ID\",\"amount\":3000,\"notes\":\"Refrigerated truck available\"}" > /dev/null
  echo -e "${GREEN}✓ Created bids on jobs${NC}"

  echo ""
  echo "Creating assigned and in-transit jobs..."
  
  # Accept a bid and create assigned job
  curl -s -X POST "$BIDDING_URL/bids/$BID1_ID/accept" -H "Authorization: Bearer $SHIPPER1_TOKEN" -H "X-User-ID: $SHIPPER1_ID" > /dev/null
  
  # Create and complete a job for tracking demo
  response=$(curl -s -X POST "$JOB_URL/jobs" -H "Content-Type: application/json" -H "Authorization: Bearer $SHIPPER1_TOKEN" -H "X-User-ID: $SHIPPER1_ID" \
    -d '{"pickup_city":"Melbourne","pickup_state":"VIC","delivery_city":"Sydney","delivery_state":"NSW","pickup_date":"2026-01-05","delivery_date":"2026-01-06","cargo_type":"General Cargo","weight":10000,"vehicle_type":"dry_van","price":2000}')
  JOB_TRACK_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  
  response=$(curl -s -X POST "$BIDDING_URL/bids" -H "Content-Type: application/json" -H "Authorization: Bearer $DRIVER2_TOKEN" -H "X-User-ID: $DRIVER2_ID" \
    -d "{\"job_id\":\"$JOB_TRACK_ID\",\"amount\":1900}")
  BID_TRACK_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  
  curl -s -X POST "$BIDDING_URL/bids/$BID_TRACK_ID/accept" -H "Authorization: Bearer $SHIPPER1_TOKEN" -H "X-User-ID: $SHIPPER1_ID" > /dev/null
  curl -s -X POST "$JOB_URL/jobs/$JOB_TRACK_ID/pickup" -H "Authorization: Bearer $DRIVER2_TOKEN" -H "X-User-ID: $DRIVER2_ID" > /dev/null
  echo -e "${GREEN}✓ Created in-transit job${NC}"

  echo ""
  echo "Adding tracking data..."
  
  # Melbourne-Sydney route points from OSRM (actual road coordinates)
  # With stop at Albury area (point 4)
  ROUTE_COORDS=(
    "-37.8136,144.9630,80"    # Melbourne
    "-37.6408,144.9287,80"    # Craigieburn area
    "-37.0633,145.1008,80"    # Seymour area
    "-36.1666,146.5175,0"     # Albury area - STOP
    "-36.1666,146.5175,0"     # Albury - still stopped
    "-36.1666,146.5175,0"     # Albury - still stopped
    "-35.2277,147.7865,80"    # Wagga area
    "-34.8063,148.9064,80"    # Goulburn area
    "-34.6722,150.0647,80"    # Current location
  )
  
  for i in "${!ROUTE_COORDS[@]}"; do
    IFS=',' read -r lat lng speed <<< "${ROUTE_COORDS[$i]}"
    curl -s -X POST "$TRACKING_URL/tracking/update" -H "Content-Type: application/json" -H "Authorization: Bearer $DRIVER2_TOKEN" -H "X-User-ID: $DRIVER2_ID" \
      -d "{\"job_id\":\"$JOB_TRACK_ID\",\"driver_id\":\"$DRIVER2_ID\",\"latitude\":$lat,\"longitude\":$lng,\"speed\":$speed,\"heading\":45,\"event_type\":\"location\"}" > /dev/null
    sleep 0.1
  done
  echo -e "${GREEN}✓ Added tracking data (9 points with stop in Albury)${NC}"

  echo ""
  echo "Creating completed jobs with ratings..."
  
  # Create completed jobs
  for i in 1 2 3; do
    response=$(curl -s -X POST "$JOB_URL/jobs" -H "Content-Type: application/json" -H "Authorization: Bearer $SHIPPER1_TOKEN" -H "X-User-ID: $SHIPPER1_ID" \
      -d "{\"pickup_city\":\"Sydney\",\"pickup_state\":\"NSW\",\"delivery_city\":\"Melbourne\",\"delivery_state\":\"VIC\",\"pickup_date\":\"2025-12-0${i}\",\"delivery_date\":\"2025-12-0$((i+1))\",\"cargo_type\":\"General\",\"weight\":5000,\"vehicle_type\":\"dry_van\",\"price\":$((1500 + i * 200))}")
    COMPLETED_JOB_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    
    response=$(curl -s -X POST "$BIDDING_URL/bids" -H "Content-Type: application/json" -H "Authorization: Bearer $DRIVER1_TOKEN" -H "X-User-ID: $DRIVER1_ID" \
      -d "{\"job_id\":\"$COMPLETED_JOB_ID\",\"amount\":$((1400 + i * 200))}")
    COMPLETED_BID_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    
    curl -s -X POST "$BIDDING_URL/bids/$COMPLETED_BID_ID/accept" -H "Authorization: Bearer $SHIPPER1_TOKEN" -H "X-User-ID: $SHIPPER1_ID" > /dev/null
    curl -s -X POST "$JOB_URL/jobs/$COMPLETED_JOB_ID/pickup" -H "Authorization: Bearer $DRIVER1_TOKEN" -H "X-User-ID: $DRIVER1_ID" > /dev/null
    curl -s -X POST "$JOB_URL/jobs/$COMPLETED_JOB_ID/deliver" -H "Authorization: Bearer $DRIVER1_TOKEN" -H "X-User-ID: $DRIVER1_ID" > /dev/null
    
    # Add ratings
    curl -s -X POST "$RATING_URL/ratings" -H "Content-Type: application/json" -H "Authorization: Bearer $SHIPPER1_TOKEN" -H "X-User-ID: $SHIPPER1_ID" \
      -d "{\"job_id\":\"$COMPLETED_JOB_ID\",\"ratee_id\":\"$DRIVER1_ID\",\"rating\":$((4 + (i % 2))),\"comment\":\"Great delivery!\"}" > /dev/null
    curl -s -X POST "$RATING_URL/ratings" -H "Content-Type: application/json" -H "Authorization: Bearer $DRIVER1_TOKEN" -H "X-User-ID: $DRIVER1_ID" \
      -d "{\"job_id\":\"$COMPLETED_JOB_ID\",\"ratee_id\":\"$SHIPPER1_ID\",\"rating\":5,\"comment\":\"Easy to work with\"}" > /dev/null
    
    # Create payment
    curl -s -X POST "$PAYMENT_URL/payments" -H "Content-Type: application/json" -H "Authorization: Bearer $SHIPPER1_TOKEN" \
      -d "{\"job_id\":\"$COMPLETED_JOB_ID\",\"payer_id\":\"$SHIPPER1_ID\",\"payee_id\":\"$DRIVER1_ID\",\"amount\":$((1400 + i * 200))}" > /dev/null
  done
  echo -e "${GREEN}✓ Created 3 completed jobs with ratings${NC}"

  echo ""
  echo "Creating notifications..."
  
  curl -s -X POST "$NOTIFICATION_URL/notifications/send" -H "Content-Type: application/json" \
    -d "{\"user_id\":\"$SHIPPER1_ID\",\"type\":\"push\",\"title\":\"New bid received\",\"message\":\"You have a new bid on your Melbourne to Sydney job\"}" > /dev/null
  curl -s -X POST "$NOTIFICATION_URL/notifications/send" -H "Content-Type: application/json" \
    -d "{\"user_id\":\"$SHIPPER1_ID\",\"type\":\"push\",\"title\":\"Job delivered\",\"message\":\"Your shipment has been delivered successfully\"}" > /dev/null
  curl -s -X POST "$NOTIFICATION_URL/notifications/send" -H "Content-Type: application/json" \
    -d "{\"user_id\":\"$DRIVER1_ID\",\"type\":\"push\",\"title\":\"Bid accepted!\",\"message\":\"Your bid on the Melbourne-Sydney job was accepted\"}" > /dev/null
  curl -s -X POST "$NOTIFICATION_URL/notifications/send" -H "Content-Type: application/json" \
    -d "{\"user_id\":\"$DRIVER1_ID\",\"type\":\"push\",\"title\":\"Payment received\",\"message\":\"You received \$1,600 for your last delivery\"}" > /dev/null
  echo -e "${GREEN}✓ Created notifications${NC}"

  echo ""
  echo -e "${GREEN}========================================${NC}"
  echo -e "${GREEN}  Demo data loaded successfully!${NC}"
  echo -e "${GREEN}========================================${NC}"
  echo ""
  echo "Demo Accounts (password: $DEMO_PASSWORD):"
  echo "  Shippers:"
  echo "    - demo_shipper1@truckify.demo"
  echo "    - demo_shipper2@truckify.demo"
  echo "    - demo_shipper3@truckify.demo"
  echo "  Drivers:"
  echo "    - demo_driver1@truckify.demo (Pro subscription)"
  echo "    - demo_driver2@truckify.demo (has in-transit job)"
  echo "    - demo_driver3@truckify.demo"
  echo "    - demo_driver4@truckify.demo"
  echo "    - demo_driver5@truckify.demo"
  echo "  Fleet Operator:"
  echo "    - demo_fleet@truckify.demo"
  echo "  Admin:"
  echo "    - admin@truckify.com / admin123"
  echo ""
}

case "$1" in
  load)
    load_data
    ;;
  unload)
    unload_data
    ;;
  *)
    echo "Usage: $0 {load|unload}"
    echo "  load   - Load demo data for all screens"
    echo "  unload - Remove all demo data"
    exit 1
    ;;
esac
