#!/bin/bash

# Truckify System Health Check
# Verifies all services are responsive

SERVICES=(
  "API Gateway|http://localhost:8000/health|200"
  "Auth Service|http://localhost:8001/health|200"
  "User Service|http://localhost:8002/health|200"
  "Driver Service|http://localhost:8004/health|200"
  "Fleet Service|http://localhost:8005/health|200"
  "Job Service|http://localhost:8006/health|200"
  "Matching Service|http://localhost:8007/health|200"
  "Bidding Service|http://localhost:8008/health|200"
  "Route Service|http://localhost:8009/health|200"
  "Backhaul Service|http://localhost:8010/health|200"
  "Tracking Service|http://localhost:8011/health|200"
  "Payment Service|http://localhost:8012/health|200"
  "Rating Service|http://localhost:8013/health|200"
  "Notification Service|http://localhost:8014/health|200"
  "Analytics Service|http://localhost:8015/health|200"
  "Compliance Service|http://localhost:8016/health|200"
  "Admin Service|http://localhost:8017/api/v1/admin/config|200"
  "Frontend|http://localhost:5173/|200"
  "Prometheus|http://localhost:9090/|302"
  "Grafana|http://localhost:3000/|302"
  "Kibana|http://localhost:5601/|302"
  "Consul|http://localhost:8500/|301"
)

FAILED=0
PASSED=0

echo "🔍 Truckify System Health Check"
echo "================================"
echo ""

for service in "${SERVICES[@]}"; do
  name=$(echo "$service" | cut -d'|' -f1)
  url=$(echo "$service" | cut -d'|' -f2)
  expected=$(echo "$service" | cut -d'|' -f3)
  
  status=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
  
  if [[ "$status" == "$expected" ]]; then
    echo "✅ $name - $status"
    ((PASSED++))
  else
    echo "❌ $name - Expected $expected, got $status"
    ((FAILED++))
  fi
done

echo ""
echo "================================"
echo "Results: $PASSED passed, $FAILED failed"
echo ""

if [ $FAILED -eq 0 ]; then
  echo "✅ All systems operational!"
  exit 0
else
  echo "⚠️  Some services are not responding"
  exit 1
fi
