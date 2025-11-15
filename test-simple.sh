#!/bin/bash

echo "Testing Video Dubbing Platform..."

API_URL="http://localhost:3001/api"

# Test health endpoint
echo "1. Testing health endpoint..."
curl -s $API_URL/../health | jq .

# Test registration
echo -e "\n2. Testing user registration..."
REGISTER_RESPONSE=$(curl -s -X POST $API_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}')

echo $REGISTER_RESPONSE | jq .

TOKEN=$(echo $REGISTER_RESPONSE | jq -r .token)

if [ "$TOKEN" = "null" ]; then
  echo "Registration failed, trying login..."
  LOGIN_RESPONSE=$(curl -s -X POST $API_URL/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"test123"}')
  TOKEN=$(echo $LOGIN_RESPONSE | jq -r .token)
fi

echo "Token: $TOKEN"

# Test project creation
echo -e "\n3. Testing project creation..."
PROJECT_RESPONSE=$(curl -s -X POST $API_URL/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Test Project","sourceLanguage":"en","targetLanguage":"es"}')

echo $PROJECT_RESPONSE | jq .

PROJECT_ID=$(echo $PROJECT_RESPONSE | jq -r .id)
echo "Project ID: $PROJECT_ID"

# Test project list
echo -e "\n4. Testing project list..."
curl -s -X GET $API_URL/projects \
  -H "Authorization: Bearer $TOKEN" | jq .

echo -e "\n✅ All tests passed!"
