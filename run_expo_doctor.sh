#!/bin/bash
# Expo Doctor Test Script for Hillaha Platform

export JAVA_HOME="/c/Users/MoustafaMohamed/AppData/Local/Programs/Eclipse Adoptium/jdk-17.0.18.8-hotspot/"
export PATH="$JAVA_HOME/bin:$PATH"

echo "================================================"
echo "🔍 EXPO DOCTOR - Hillaha Platform"
echo "================================================"
echo ""

# Test 1: Check Java
echo "1️⃣  Java Version Check:"
echo "   Expected: 17+ ✓"
java -version
echo ""

# Test 2: Check Node
echo "2️⃣  Node Version:"
node --version
echo ""

# Test 3: Check npm/pnpm
echo "3️⃣  Package Manager:"
pnpm --version
echo ""

# Test 4: Expo doctor - Customer app
echo "4️⃣  Testing Customer App (Expo SDK 54)..."
cd /c/hillaha-platform/apps/customer
if expo doctor > /tmp/expo_customer.log 2>&1; then
  echo "   ✓ Customer app OK"
else
  echo "   ❌ Customer app has issues:"
  tail -20 /tmp/expo_customer.log
fi
echo ""

# Test 5: Expo doctor - Driver app
echo "5️⃣  Testing Driver App (Expo SDK 54)..."
cd /c/hillaha-platform/apps/driver
if expo doctor > /tmp/expo_driver.log 2>&1; then
  echo "   ✓ Driver app OK"
else
  echo "   ❌ Driver app has issues:"
  tail -20 /tmp/expo_driver.log
fi
echo ""

# Test 6: Expo doctor - Services Worker app
echo "6️⃣  Testing Services-Worker App (Expo SDK 54)..."
cd /c/hillaha-platform/apps/services-worker
if expo doctor > /tmp/expo_services.log 2>&1; then
  echo "   ✓ Services-Worker app OK"
else
  echo "   ❌ Services-Worker app has issues:"
  tail -20 /tmp/expo_services.log
fi
echo ""

echo "================================================"
echo "✅ Expo Doctor Tests Complete"
echo "================================================"
