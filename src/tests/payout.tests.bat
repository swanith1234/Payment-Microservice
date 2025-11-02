@echo off
:: ---------------------------------------------
:: 💸 Phase 4: Payout Management - API Test Script (Windows)
:: ---------------------------------------------

set BASE_URL=http://localhost:3000/api
set INSTRUCTOR_ID=1001
set WALLET_ID=1

echo 🚀 Starting Payout Flow Testing...

:: 1️⃣ Check Available Balance
echo 📊 Checking available balance...
curl -X GET "%BASE_URL%/payouts/wallet/%WALLET_ID%/available-balance"

:: 2️⃣ Calculate Payout Amount
echo 🧮 Calculating payout amount (after fees)...
curl -X POST "%BASE_URL%/payouts/calculate-amount" ^
  -H "Content-Type: application/json" ^
  -d "{\"grossAmount\":6700}"

:: 3️⃣ Schedule Instant Payout
echo 🗓️ Scheduling instant payout...
curl -X POST "%BASE_URL%/payouts/schedule" ^
  -H "Content-Type: application/json" ^
  -d "{
    \"instructorId\": %INSTRUCTOR_ID%,
    \"walletId\": %WALLET_ID%,
    \"amount\": 6690,
    \"metadata\": {
      \"bankDetails\": {
        \"accountNumber\": \"1234567890\",
        \"ifscCode\": \"SBIN0001234\",
        \"accountHolderName\": \"John Doe\",
        \"bankName\": \"State Bank of India\"
      },
      \"note\": \"Monthly payout test\"
    }
  }"

:: 4️⃣ Process Payout
echo 💰 Processing payout...
curl -X POST "%BASE_URL%/payouts/1/process" ^
  -H "Content-Type: application/json" ^
  -d "{
    \"bankDetails\": {
      \"accountNumber\": \"1234567890\",
      \"ifscCode\": \"SBIN0001234\",
      \"accountHolderName\": \"John Doe\",
      \"bankName\": \"State Bank of India\"
    }
  }"

:: 5️⃣ Check Wallet Balance After Payout
echo 💼 Checking wallet balance after payout...
curl -X GET "%BASE_URL%/wallets/%WALLET_ID%/balance"

:: 6️⃣ Get Payout by ID
echo 🔍 Getting payout by ID...
curl -X GET "%BASE_URL%/payouts/1"

:: 7️⃣ Get All Payouts for Instructor
echo 📄 Getting all payouts for instructor...
curl -X GET "%BASE_URL%/payouts/instructor/%INSTRUCTOR_ID%?page=1&limit=10"

:: 8️⃣ Get Instructor Payout Statistics
echo 📈 Getting payout statistics...
curl -X GET "%BASE_URL%/payouts/instructor/%INSTRUCTOR_ID%/stats"

:: 9️⃣ Cancel a Payout (example ID = 2)
echo ❌ Cancelling payout ID 2...
curl -X POST "%BASE_URL%/payouts/2/cancel" ^
  -H "Content-Type: application/json" ^
  -d "{\"reason\": \"Instructor requested cancellation\"}"

:: 🔟 Process All Scheduled Payouts (Cron Simulation)
echo ⏰ Processing all scheduled payouts...
curl -X POST "%BASE_URL%/payouts/process-scheduled"

echo ✅ Phase 4 API Testing Completed!
pause
