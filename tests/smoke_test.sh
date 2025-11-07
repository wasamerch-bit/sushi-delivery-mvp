#!/bin/bash
# smoke_test.sh - einfache Smoke-Tests gegen lokalen mock-server (http://localhost:3000)
set -e

BASE="http://localhost:3000"

echo "1) POST /webhook/orders - create order"
RES=$(curl -s -X POST "$BASE/webhook/orders" -H "Content-Type: application/json" -d '{
  "event_id":"evt-1",
  "source":"sides",
  "timestamp":"2025-11-07T17:00:00+01:00",
  "order":{
    "order_id":"ch-1001",
    "channel":"sides",
    "channel_order_id":"ch-1001",
    "customer_name":"Test Kunde",
    "customer_phone":"+491234",
    "delivery_address":{"street":"Musterstr 1","zip":"10115","city":"Berlin"},
    "items":[{"sku":"salmon_nigiri_2","qty":2,"prep_time":120,"station":"sushi"},{"sku":"miso_soup","qty":1,"prep_time":300,"station":"hot"}],
    "requested_time":"2025-11-07T19:00:00+01:00"
  }
}')
echo "-> $RES"

ORDER_ID=$(echo $RES | jq -r '.order_id')
if [ "$ORDER_ID" = "null" ] || [ -z "$ORDER_ID" ]; then
  echo "Order creation failed"
  exit 1
fi
echo "Order created: $ORDER_ID"

echo "2) GET /tasks?station=sushi"
curl -s "$BASE/tasks?station=sushi" | jq

echo "3) GET /dashboard/overview"
curl -s "$BASE/dashboard/overview" | jq

echo "Smoke tests passed"
