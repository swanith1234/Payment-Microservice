#!/bin/bash

BASE_URL="http://localhost:3000/api"

echo "=== Testing Transaction APIs ==="

echo "\n1. Creating CHARGE transaction..."
curl -X POST $BASE_URL/transactions \
  -H "Content-Type: application/json" \
  -d '{"type":"CHARGE","amount":5000,"userId":1001,"walletId":1,"paymentMethod":"UPI"}'

echo "\n\n2. Updating to SUCCESS..."
curl -X PATCH $BASE_URL/transactions/1/status \
  -H "Content-Type: application/json" \
  -d '{"status":"SUCCESS"}'

echo "\n\n3. Getting transaction..."
curl -X GET $BASE_URL/transactions/1

echo "\n\n4. Getting user transactions..."
curl -X GET $BASE_URL/transactions/user/1001

echo "\n\n5. Getting user stats..."
curl -X GET $BASE_URL/transactions/user/1001/stats

echo "\n\n6. Calculating net amount..."
curl -X POST $BASE_URL/transactions/calculate-net \
  -H "Content-Type: application/json" \
  -d '{"grossAmount":10000,"commissionPercent":15,"taxPercent":18}'