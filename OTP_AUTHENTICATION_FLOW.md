# OTP Authentication Flow for Stakeholder Approval

## Overview
When a stakeholder is added to a document version and an approval email is sent, the system checks if the stakeholder's email is registered in the database:
- **Registered users**: Direct access to approval page
- **Unregistered users**: OTP verification required before accessing approval page

## Components Created

### 1. OTPVerification.jsx
**Path**: `src/pages/StakeholderApproval/OTPVerification.jsx`

**Features:**
- 6-digit OTP input with auto-focus
- Email display
- 60-second countdown for resend
- Auto-verification on complete OTP entry
- Paste support for OTP codes
- Responsive design matching the app theme

### 2. Updated Routes (App.jsx)
**New Routes:**
```
/verify-otp/:token  → OTPVerification component (public)
/approval/:token    → StakeholderApproval component (public)
```

### 3. Updated VersionDetailsModal
**Changes:**
- Modified `handleSendApprovalEmail()` to call backend API
- Backend handles OTP generation for unregistered users
- Updated `getApprovalLink()` to point to `/verify-otp/:token`

## User Flow

### For Unregistered Stakeholders:

1. **Stakeholder Added**
   - Admin adds stakeholder to a version
   - Clicks "Send" button to send approval email

2. **Email Sent**
   - Backend checks if email exists in user database
   - If NOT registered:
     - Generate 6-digit OTP
     - Send email with approval link: `domain.com/verify-otp/{token}`
     - OTP expires in 10 minutes (configurable)

3. **Stakeholder Clicks Link**
   - Opens `/verify-otp/{token}` page
   - Backend verifies token is valid
   - Shows OTP verification screen with stakeholder's email

4. **OTP Verification**
   - Stakeholder enters 6-digit OTP from email
   - Can resend OTP after 60 seconds
   - Backend validates OTP

5. **Access Granted**
   - On successful OTP verification
   - Redirects to `/approval/{token}`
   - Shows document approval page

### For Registered Stakeholders:

1. **Stakeholder Added**
   - Admin adds stakeholder (email exists in database)
   - Clicks "Send" button

2. **Email Sent**
   - Backend detects user is registered
   - Sends email with direct link: `domain.com/approval/{token}`
   - No OTP required

3. **Direct Access**
   - Stakeholder clicks link
   - Opens approval page directly
   - No OTP verification needed

## Backend API Endpoints Required

### 1. Verify Token and Check Registration
```
GET /api/stakeholder-approval/verify-token/:token

Response:
{
  "email": "stakeholder@example.com",
  "isRegistered": false,  // true if user exists in database
  "name": "John Doe"
}
```

### 2. Send Approval Email (with OTP for unregistered)
```
POST /api/stakeholder-approval/send-approval-email

Body:
{
  "token": "version-stakeholder-timestamp",
  "stakeholderEmail": "stakeholder@example.com",
  "stakeholderName": "John Doe",
  "versionId": 1,
  "documentName": "SOP_Warehouse_v2.pdf"
}

Response:
{
  "success": true,
  "requiresOTP": true,  // true if unregistered user
  "message": "Approval email sent with OTP"
}
```

### 3. Verify OTP
```
POST /api/stakeholder-approval/verify-otp

Body:
{
  "token": "version-stakeholder-timestamp",
  "otp": "123456"
}

Response:
{
  "success": true,
  "message": "OTP verified successfully"
}
```

### 4. Resend OTP
```
POST /api/stakeholder-approval/resend-otp

Body:
{
  "token": "version-stakeholder-timestamp"
}

Response:
{
  "success": true,
  "message": "OTP sent successfully"
}
```

## Email Templates

### For Unregistered Users (with OTP):
```
Subject: Document Approval Required - Verify Your Email

Hi [Stakeholder Name],

You have been requested to review and approve a document: [Document Name]

To access the approval page, please verify your email using the link below:
[Link to /verify-otp/{token}]

You will receive a 6-digit verification code in a separate email.

This link expires in 24 hours.

Best regards,
Document Management System
```

### OTP Email:
```
Subject: Your Verification Code

Hi [Stakeholder Name],

Your verification code is: 123456

This code expires in 10 minutes.

If you didn't request this code, please ignore this email.

Best regards,
Document Management System
```

### For Registered Users (no OTP):
```
Subject: Document Approval Required

Hi [Stakeholder Name],

You have been requested to review and approve a document: [Document Name]

Click the link below to access the approval page:
[Link to /approval/{token}]

This link expires in 24 hours.

Best regards,
Document Management System
```

## Security Features

1. **Token Validation**: Each token is unique and time-limited
2. **OTP Expiration**: OTP expires after 10 minutes
3. **Rate Limiting**: Resend OTP limited to once per 60 seconds
4. **Single Use**: OTP can only be used once
5. **Session Management**: OTP verification creates a temporary session

## Database Schema Updates Required

### OTP Table
```sql
CREATE TABLE stakeholder_otps (
  id INT PRIMARY KEY AUTO_INCREMENT,
  token VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  otp VARCHAR(6) NOT NULL,
  expires_at DATETIME NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_token (token),
  INDEX idx_email (email)
);
```

## UI Features

### OTP Verification Page:
- ✅ 6-digit OTP input boxes
- ✅ Auto-focus on next input
- ✅ Paste support
- ✅ Backspace navigation
- ✅ Resend OTP with countdown
- ✅ Email masking for privacy
- ✅ Loading states
- ✅ Error handling
- ✅ Responsive design

### Success States:
- ✅ Shows success message
- ✅ Auto-redirect to approval page
- ✅ Toast notifications

## Testing Checklist

- [ ] Unregistered user receives OTP email
- [ ] OTP verification succeeds with correct code
- [ ] OTP verification fails with incorrect code
- [ ] OTP expires after 10 minutes
- [ ] Resend OTP works after 60 seconds
- [ ] Registered user skips OTP verification
- [ ] Token validation works correctly
- [ ] Multiple OTP attempts are blocked
- [ ] Expired tokens are rejected
- [ ] Invalid tokens are rejected

## Configuration

Add to `.env`:
```
OTP_EXPIRY_MINUTES=10
OTP_RESEND_COOLDOWN_SECONDS=60
EMAIL_FROM=noreply@yourdomain.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

This implementation provides a secure, user-friendly OTP authentication system for stakeholder approvals!
