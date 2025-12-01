# Paystack Integration Setup Guide

## Current Status
- ✅ Payment endpoints implemented
- ✅ Payment page UI complete
- ✅ Transaction tracking ready
- ⚠️ Using placeholder keys (test mode)

## How to Enable Real Paystack Payments

### Step 1: Get Your Paystack Keys

1. Go to [Paystack Dashboard](https://dashboard.paystack.com/)
2. Login or create account
3. Navigate to: **Settings → API Keys & Webhooks**
4. Copy your keys:
   - **Test Keys** (for testing): `pk_test_...` and `sk_test_...`
   - **Live Keys** (for production): `pk_live_...` and `sk_live_...`

### Step 2: Update Backend Configuration

Edit `/app/backend/.env`:

```bash
# Replace these lines:
PAYSTACK_PUBLIC_KEY="pk_test_placeholder_replace_with_actual_key"
PAYSTACK_SECRET_KEY="sk_test_placeholder_replace_with_actual_key"

# With your actual keys:
PAYSTACK_PUBLIC_KEY="pk_test_your_actual_test_key_here"
PAYSTACK_SECRET_KEY="sk_test_your_actual_test_key_here"

# For production, use live keys:
# PAYSTACK_PUBLIC_KEY="pk_live_your_actual_live_key"
# PAYSTACK_SECRET_KEY="sk_live_your_actual_live_key"
```

### Step 3: Restart Backend

```bash
sudo supervisorctl restart backend
```

### Step 4: Test Payment Flow

1. Login as customer
2. Browse and book a service
3. You'll be redirected to payment page
4. Click "Pay Now"
5. Paystack checkout opens
6. Use Paystack test cards:
   - **Success:** `4084084084084081`
   - **Insufficient Funds:** `5060666666666666666`
   - **Invalid CVV:** `5531886652142950`
   - **Expiry:** Any future date
   - **CVV:** 123

### Step 5: Verify It Works

After payment:
- Check customer dashboard - booking status should update
- Check provider dashboard - should see confirmed booking
- Check transaction in Paystack dashboard

## Webhook Setup (Optional - For Production)

### Step 1: Set Webhook URL

In Paystack Dashboard:
1. Go to **Settings → API Keys & Webhooks**
2. Add webhook URL: `https://your-domain.com/api/webhooks/paystack`
3. Select events: `charge.success`

### Step 2: Add Webhook Handler (Already Implemented)

The backend already handles webhooks at `/api/webhooks/paystack`

## Test Cards Reference

| Card Number | Scenario | CVV | PIN |
|------------|----------|-----|-----|
| 4084084084084081 | Success | 123 | 1234 |
| 5060666666666666666 | Insufficient funds | 123 | 1234 |
| 5531886652142950 | Invalid CVV | 123 | 1234 |

## Payment Flow

```
Customer books service
        ↓
Redirected to /payment/:bookingId
        ↓
Sees payment breakdown
        ↓
Clicks "Pay Now"
        ↓
Paystack checkout opens
        ↓
Customer enters card details
        ↓
Payment processed
        ↓
Redirected back to app
        ↓
Booking marked as paid
        ↓
Provider notified
```

## Troubleshooting

**Issue: "Invalid API Key"**
- Check that keys are correctly copied (no extra spaces)
- Ensure you're using the right key type (test vs live)
- Restart backend after changing keys

**Issue: Payment not completing**
- Check browser console for errors
- Verify backend is running: `curl http://localhost:8001/api/categories`
- Check backend logs: `tail -f /var/log/supervisor/backend.err.log`

**Issue: Webhook not receiving events**
- Ensure webhook URL is accessible from internet
- Check Paystack dashboard → Webhooks → Event Log
- Verify endpoint returns 200 OK

## Production Checklist

Before going live:
- [ ] Replace test keys with live keys
- [ ] Test complete payment flow
- [ ] Set up webhook URL
- [ ] Test webhook receiving events
- [ ] Enable HTTPS on your domain
- [ ] Test with real cards (small amounts)
- [ ] Set up email notifications
- [ ] Monitor transactions in Paystack dashboard

## Current Test Mode

Without real keys, the system:
- ✅ Shows payment page
- ✅ Displays payment breakdown
- ✅ Simulates payment success
- ✅ Marks booking as paid
- ✅ Updates provider dashboard
- ⚠️ Does NOT actually charge cards
- ⚠️ Does NOT create Paystack transactions

## Need Help?

- [Paystack Documentation](https://paystack.com/docs)
- [Paystack Test Cards](https://paystack.com/docs/payments/test-payments)
- [Paystack Support](https://paystack.com/support)
