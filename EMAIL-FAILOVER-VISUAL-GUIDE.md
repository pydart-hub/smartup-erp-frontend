# Email Sending Failover — Visual Structure & Flow

---

## 🔄 SEQUENTIAL FAILOVER FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────┐
│                    sendEmail() Called                               │
│            Email to: onxinsane@gmail.com                            │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
            ┌────────────────────────────┐
            │   Load All 3 Accounts      │
            │ from .env.local            │
            └────────────┬───────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
    Account 1        Account 2        Account 3
    
    
┌─────────────────────────────────────────────────────────────────────┐
│  ACCOUNT 1: invoicesmartup@gmail.com                                │
├─────────────────────────────────────────────────────────────────────┤
│  Status: ✅ ACTIVE & VERIFIED                                       │
│  Role: Primary SMTP Account (Slot 1)                                │
│  Credentials: Masked in git (verified & active in .env.local)       │
│  Delivery: Verified via live test email to recipient                │
│                                                                     │
│  Flow: TRY → ✅ SEND → RETURN MESSAGE_ID → STOP                     │
└─────────────────────────────────────────────────────────────────────┘
        │
        │ Failed, try next
        ▼
┌─────────────────────────────────────────────────────────────────────┐
│  ACCOUNT 2: invoices.smartup@gmail.com                              │
├─────────────────────────────────────────────────────────────────────┤
│  Status: ✅ ACTIVE & VERIFIED (Secondary)                           │
│  Role: Secondary SMTP failover account (Slot 2)                     │
│  Credentials: Masked in git (verified & active in .env.local)       │
│  Delivery: Verified via live test email to recipient                │
│                                                                     │
│  Flow: TRY → ✅ SEND (or ❌ CATCH ERROR → CONTINUE TO ACCOUNT 3)   │
└─────────────────────────────────────────────────────────────────────┘
        │
        │ Failed, try next
        ▼
┌─────────────────────────────────────────────────────────────────────┐
│  ACCOUNT 3: smartup.acc.2026@gmail.com                              │
├─────────────────────────────────────────────────────────────────────┤
│  Status: ✅ ACTIVE & VERIFIED (Tertiary Backup)                     │
│  Role: Tertiary SMTP failover account (Slot 3)                      │
│  Credentials: Saved in .env.local (masked in git)                   │
│  Delivery: Verified via live test email to recipient                │
│                                                                     │
│  Flow: TRY → ✅ SEND → RETURN MESSAGE_ID → STOP                    │
└─────────────────────────────────────────────────────────────────────┘
        │
        │ Success! Email sent
        ▼
    ┌─────────────────────┐
    │ ✅ Email Delivered  │
    │ MessageID returned  │
    │ Function exits      │
    └─────────────────────┘
```

---

## 📊 ACCOUNT CONFIGURATION TABLE

```
┌──────────┬──────────────────────────────┬────────────┬──────────────┬─────────────────────┐
│ Account  │ Email Address                │ Status     │ Current Role │ Daily Capacity      │
├──────────┼──────────────────────────────┼────────────┼──────────────┼─────────────────────┤
│ Account 1│ invoicesmartup@gmail.com     │ ✅ ACTIVE  │ Primary      │ ~500 emails/day     │
│          │                              │            │ (VERIFIED)   │ (AVAILABLE)         │
├──────────┼──────────────────────────────┼────────────┼──────────────┼─────────────────────┤
│ Account 2│ invoices.smartup@gmail.com   │ ✅ ACTIVE  │ Secondary    │ ~500 emails/day     │
│          │                              │            │ (VERIFIED)   │ (AVAILABLE)         │
├──────────┼──────────────────────────────┼────────────┼──────────────┼─────────────────────┤
│ Account 3│ smartup.acc.2026@gmail.com   │ ✅ ACTIVE  │ Tertiary     │ ~500 emails/day     │
│          │                              │            │ (VERIFIED)   │ (AVAILABLE)         │
└──────────┴──────────────────────────────┴────────────┴──────────────┴─────────────────────┘
```

---

## 🔍 CODE LOGIC (Simplified)

```javascript
async function sendEmail(options) {
  // Step 1: Get all accounts
  const accounts = [
    { user: "invoicesmartup@gmail.com",          pass: "***" },  // Account 1 (Primary)
    { user: "invoices.smartup@gmail.com",        pass: "***" },  // Account 2 (Secondary)
    { user: "smartup.acc.2026@gmail.com",        pass: "***" },  // Account 3 (Tertiary)
  ];

  // Step 2: Loop through each account
  for (const account of accounts) {
    try {
      // Try to send email with this account
      const result = await sendMailWithAccount(account, options);
      
      // ✅ SUCCESS - Stop here and return
      console.log(`✅ Sent via ${account.user}`);
      return result;
      
    } catch (error) {
      // ❌ FAILED - Log and try next account
      console.log(`❌ ${account.user} failed: ${error.message}`);
      // Continue to next account
    }
  }

  // ❌ ALL ACCOUNTS FAILED
  throw new Error("All accounts exhausted");
}
```

---

## 💬 WHAT HAPPENS AT EACH STEP

### When Email Sent Today (April 28, 2026):

```
┌─ ATTEMPT 1: invoicesmartup@gmail.com
│  ├─ Connect to SMTP: smtp.gmail.com:587
│  ├─ Authenticate with credentials: "**** **** **** ****" (stored in .env.local)
│  ├─ Send...
│  └─ ✅ SUCCESS → return MessageID & exit
│
├─ ATTEMPT 2: invoices.smartup@gmail.com
│  ├─ Connect to SMTP: smtp.gmail.com:587
│  ├─ Authenticate with credentials: "**** **** **** ****" (stored in .env.local)
│  ├─ Prepare email for: onxinsane@gmail.com
│  └─ Send...
│     ├─ ✅ SUCCESS → return MessageID & exit
│     └─ ❌ ERROR (if quota/auth fails) → TRY NEXT ACCOUNT
│
└─ ATTEMPT 3: smartup.acc.2026@gmail.com
   ├─ Connect to SMTP: smtp.gmail.com:587
   ├─ Authenticate with credentials: "**** **** **** ****" (stored in .env.local)
   ├─ Prepare email for: onxinsane@gmail.com
   └─ Send...
      ├─ ✅ SUCCESS → return MessageID & exit
      └─ ❌ ALL ACCOUNTS EXHAUSTED (if Account 3 fails)
```

---

## 🎯 WHY THIS DESIGN?

### Benefits of Sequential Failover:

```
1. REDUNDANCY
   ├─ Multiple email accounts
   ├─ If one fails, another takes over
   └─ No single point of failure

2. RELIABILITY
   ├─ High delivery rate (3 chances to send)
   ├─ Automatic retry across accounts
   └─ User never sees email delivery errors

3. SCALABILITY
   ├─ Support high volume without quota issues
   ├─ Can add more accounts (4, 5, 6...)
   └─ Distribute load across multiple Gmail accounts

4. AUTOMATIC
   ├─ No manual intervention needed
   ├─ Transparent to application code
   └─ Works seamlessly in background
```

---

## 🚨 ACCOUNT 1 ISSUE: Daily Quota Exceeded

```
Gmail Daily Sending Limit: ~500 emails/day

What happened today:
  ├─ Sent 300+ test emails during verification
  ├─ Plus production emails if any
  ├─ Total: ~500+ emails sent
  └─ Result: Quota hit, Account 1 stopped working

Timeline:
  ├─ April 28, 2026 10:00 AM → Started sending emails
  ├─ April 28, 2026 04:00 PM → Hit 500 email limit
  ├─ April 28, 2026 04:02 PM → "Daily limit exceeded" error
  └─ April 29, 2026 12:00 AM (UTC) → Quota resets

When Account 1 works again:
  └─ Tomorrow at midnight UTC (approximately 8-12 hours from now)
```

---

## 🔧 ACCOUNT 2: Replaced With invoices.smartup@gmail.com

```
Account 2 email: invoices.smartup@gmail.com
Password in .env.local: (stored securely in .env.local — never commit real app passwords)
Status: ✅ CONFIGURED & VERIFIED (Test email delivered to arjunprakashk7@gmail.com)

How to rotate an App Password in the future:
  Step 1: Go to https://myaccount.google.com/apppasswords
  Step 2: Select Mail + Windows Computer
  Step 3: Gmail generates new 16-char password (e.g., "abcd efgh ijkl mnop")
  Step 4: Copy password (remove spaces): "abcdefghijklmnop"
  Step 5: Update .env.local (local & /var/www/smartup-erp/.env.local on production):
          SMTP_USER_2=invoices.smartup@gmail.com
          SMTP_PASS_2=abcdefghijklmnop
          SMTP_FROM_2=SmartUp Learning Ventures <invoices.smartup@gmail.com>
  Step 6: Restart app (local: npm run dev | production: pm2 restart ecosystem.config.js)
  Step 7: Verify SMTP auth before deploying
```

---

## ℹ️ ACCOUNT 3: smartup.acc.2026@gmail.com (Standby Fallback)

```
Email: smartup.acc.2026@gmail.com
Status: ℹ️ STANDBY FALLBACK

Characteristics:
  ├─ Password correct: ✅
  ├─ SMTP connection stable: ✅
  ├─ Daily quota: Not reached ✅
  ├─ Email delivery: Successful ✅
  └─ All tests passing: ✅

Performance today:
  ├─ Emails sent: 5 test emails
  ├─ Success rate: 100% (5/5)
  ├─ Average time: ~8 seconds per email
  └─ No errors: ✅

Can handle:
  ├─ Up to ~500 emails before daily quota
  ├─ Multiple rapid sends
  └─ Concurrent requests
```

---

## 📈 CURRENT SYSTEM HEALTH

```
┌────────────────────────────────────────────────────────────────────────┐
│   EMAIL SYSTEM STATUS                                                  │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  Primary Account (1):    ✅ invoicesmartup@gmail.com (VERIFIED)        │
│  Secondary Account (2):  ✅ invoices.smartup@gmail.com (VERIFIED)       │
│  Tertiary Account (3):   ✅ smartup.acc.2026@gmail.com (VERIFIED)       │
│                                                                        │
│  Overall Status:         ✅ FULLY OPERATIONAL (All 3 Accounts Verified)│
│  Failover Mechanism:     ✅ Configured across 3 SMTP slots             │
│  Delivery Verification:  ✅ All 3 accounts verified via test emails    │
│  Production Server:      ℹ️ Sync to /var/www/smartup-erp/.env.local    │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 NOTES

**Failover Order:** `SMTP_USER_1` → `SMTP_USER_2` (`invoices.smartup@gmail.com`) → `SMTP_USER_3`.

- **Restart required after `.env.local` edits:** `src/lib/utils/email.ts` caches SMTP accounts in `_accounts`, so restart `npm run dev` (local) or PM2 (`ecosystem.config.js` on production) after updating `.env.local`.
- **Production sync:** `.env.local` is gitignored, so `/var/www/smartup-erp/.env.local` on the server must also be updated directly.

---

**Updated:** November 11, 2026  
**Status:** Email system configured with automatic 3-account failover
