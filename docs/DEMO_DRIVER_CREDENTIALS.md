# LumenX Transport — Demo Driver Credentials

> Mock authentication only. No backend. Session is in-memory for the app run.

## Universal demo OTP

| Code | Use |
|------|-----|
| **123456** | First-login verification, forgot-password verification |

## Default first-time password

| Password | Use |
|----------|-----|
| **driver123** | First login for drivers who have not completed setup |

## Demo driver accounts

### Returning user (go straight to Dashboard)

| Field | Value |
|-------|--------|
| **Driver ID** | `DR-01` |
| **Name** | Ramesh Kumar |
| **Password** | `Ramesh@2026` |
| **Route** | Route 01 |
| **Flow** | Sign in → Dashboard |

### First-time setup (OTP + new password)

| Driver ID | Name | Default password | Route |
|-----------|------|------------------|-------|
| **DR-02** | Suresh Babu | `driver123` | Route 02 |
| **DR-03** | Venkata Rao | `driver123` | Route 03 |

**Flow:** Driver ID + default password → OTP `123456` → Create password → Confirm → Dashboard

Use a password with **8+ characters**, at least **one uppercase** and **one number** (e.g. `Suresh@02`).

### Inactive accounts (login blocked)

| Driver ID | Name | Status |
|-----------|------|--------|
| DR-04 | Prakash Reddy | On leave |
| DR-05 | Anil Sharma | Inactive |

## Forgot password (returning users only)

1. Tap **Forgot password?** on the login screen  
2. Enter Driver ID (e.g. `DR-01`)  
3. Enter OTP **123456**  
4. Set a new password and confirm  
5. Sign in with the new password  

## Password rules

- Minimum 8 characters  
- At least one uppercase letter  
- At least one number  

## Session

- Successful sign-in creates an in-app session tied to the Driver ID  
- **Logout** (Profile) clears the session and returns to login  
- Restarting the app requires sign-in again (no persistent storage in Phase 1 mock)
