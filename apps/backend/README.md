# Ticket Dashboard Backend API

## Overview

This is the backend API for the Ticket Dashboard application, built with Express.js, TypeScript, Prisma, and PostgreSQL. It provides a complete authentication system with email-based OTP login, JWT tokens, and multi-device session management.

## Features

- 🔐 **Email + OTP Authentication** - Passwordless login system
- 🎫 **JWT Tokens** - Access tokens (1 min) + Refresh tokens (7 days)
- 📱 **Multi-Device Support** - Users can login on multiple devices
- 🍪 **HttpOnly Cookies** - Secure refresh token storage
- 🚪 **Flexible Logout** - Logout from current device or all devices
- 🧹 **Auto Cleanup** - Expired tokens are automatically cleaned up
- 🛡️ **Rate Limiting** - Protection against brute force attacks
- 📊 **Device Management** - View and manage active sessions

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/ticketdb"

# JWT Secrets
JWT_SECRET="your-secret-key-for-access-tokens"
JWT_REFRESH_SECRET="your-secret-key-for-refresh-tokens"

# Email Configuration
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
FROM_EMAIL="noreply@ticketdash.com"

# Server
PORT=3001
NODE_ENV="development"
```

## Authentication System

### How It Works

1. **Login Flow:**

    ```
    User → Email → OTP → Access Token + Refresh Token Cookie
    ```

2. **Token Lifecycle:**
    - **Access Token**: 1 minute lifespan, stored in memory/localStorage
    - **Refresh Token**: 7 days lifespan, stored in httpOnly cookie

3. **Cookie Details:**
    - **HttpOnly**: Cannot be accessed via JavaScript (XSS protection)
    - **Secure**: Only sent over HTTPS in production
    - **SameSite**: CSRF protection
    - **Auto-transmitted**: Browser sends automatically with requests

## API Endpoints

### Authentication Routes

All auth routes are prefixed with `/api/auth`

#### 1. **Send OTP** - `POST /api/auth/login`

Send OTP code to user's email for authentication.

**Request:**

```json
{
	"email": "user@example.com"
}
```

**Response:**

```json
{
	"message": "OTP sent to your email",
	"otpSent": true
}
```

**Error Responses:**

- `400` - Invalid email format
- `400` - Rate limit exceeded (wait before requesting new OTP)
- `500` - Failed to send OTP

---

#### 2. **Verify OTP** - `POST /api/auth/verify-otp`

Verify OTP code and create authenticated session.

**Request:**

```json
{
	"email": "user@example.com",
	"otp": "123456",
	"deviceInfo": {
		"userAgent": "Mozilla/5.0 Chrome/91.0",
		"deviceName": "MacBook Pro" // optional
	}
}
```

**Response:**

```json
{
	"success": true,
	"user": {
		"id": "uuid",
		"email": "user@example.com",
		"username": "user1234",
		"createdAt": "2025-11-03T...",
		"updatedAt": "2025-11-03T..."
	},
	"accessToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Cookies Set:**

- `refreshToken` - HttpOnly, Secure, 7-day expiry

**Error Responses:**

- `400` - Invalid OTP or expired
- `400` - Too many failed attempts
- `400` - Invalid request format

---

#### 3. **Refresh Token** - `POST /api/auth/refresh`

Get new access token using refresh token cookie.

**Request:**

```
// No body required - refresh token comes from cookie
```

**Response:**

```json
{
	"accessToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Error Responses:**

- `401` - Missing refresh token cookie
- `401` - Invalid or expired refresh token

---

#### 4. **Logout** - `POST /api/auth/logout`

Logout from current device or all devices.

**Headers:**

```
Authorization: Bearer <access_token>
```

**Request:**

```json
{
	"logoutAll": false // optional, default false
}
```

**Response:**

```json
{
	"message": "Logged out successfully",
	"loggedOutDevices": 1
}
```

**Cookies Cleared:**

- `refreshToken` - Removed from browser

**Error Responses:**

- `401` - Authentication required
- `401` - No active session found

---

#### 5. **Get Devices** - `GET /api/auth/devices`

Get list of all active devices/sessions for current user.

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response:**

```json
{
	"devices": [
		{
			"id": "session-uuid",
			"deviceName": "Chrome Browser",
			"userAgent": "Mozilla/5.0...",
			"ipAddress": "192.168.1.100",
			"lastUsed": "2025-11-03T10:30:00Z",
			"createdAt": "2025-11-01T08:15:00Z"
		}
	]
}
```

**Error Responses:**

- `401` - Authentication required

---

#### 6. **Logout Device** - `DELETE /api/auth/devices/:sessionId`

Logout from specific device/session.

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response:**

```json
{
	"message": "Device logged out successfully",
	"success": true
}
```

**Error Responses:**

- `401` - Authentication required
- `404` - Device session not found
- `400` - Invalid session ID

---

#### 7. **Get Current User** - `GET /api/auth/me`

Get current user information and session details.

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response:**

```json
{
	"user": {
		"id": "uuid",
		"email": "user@example.com",
		"username": "user1234"
	},
	"session": {
		"sessionId": "session-uuid",
		"expiresAt": "2025-11-03T11:00:00Z"
	}
}
```

**Error Responses:**

- `401` - Authentication required

---

### General Routes

#### **Health Check** - `GET /api/health`

Check server and database status.

**Response:**

```json
{
	"status": "OK",
	"timestamp": "2025-11-03T10:30:00Z",
	"environment": "development"
}
```

---

## HTTP Status Codes

### Success Codes (2xx)

- `200 OK` - Request succeeded
- `201 Created` - Resource created successfully

### Client Error Codes (4xx)

- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Access denied
- `404 Not Found` - Resource not found
- `429 Too Many Requests` - Rate limit exceeded

### Server Error Codes (5xx)

- `500 Internal Server Error` - Server error
- `503 Service Unavailable` - Service temporarily unavailable

---

## Rate Limiting

Authentication endpoints are protected with rate limiting:

- **Login/OTP routes**: 5 attempts per 15 minutes per IP
- **Window resets**: Automatically after time period
- **Response**: 429 status with retry time

---

## Security Features

### Token Security

- **Access tokens**: Short-lived (1 minute) to minimize exposure
- **Refresh tokens**: HttpOnly cookies, cannot be accessed by JavaScript
- **CSRF protection**: SameSite cookie attribute
- **JWT signing**: Strong secret keys for token integrity

### Request Security

- **Helmet**: Security headers (CSP, XSS protection, etc.)
- **CORS**: Configured for frontend origin only
- **Input validation**: Zod schemas for all requests
- **SQL injection**: Prisma ORM provides protection

### Session Security

- **Device tracking**: IP address, user agent, device name
- **Session isolation**: Each device gets unique session ID
- **Automatic cleanup**: Expired tokens removed hourly
- **Graceful logout**: Proper session termination

---

## Error Handling

All API errors return consistent format:

```json
{
	"error": "Human-readable error message",
	"code": "MACHINE_READABLE_CODE",
	"details": {} // Optional additional details
}
```

### Common Error Codes

- `VALIDATION_ERROR` - Request validation failed
- `MISSING_TOKEN` - Authorization header missing
- `INVALID_TOKEN` - Token format or signature invalid
- `TOKEN_EXPIRED` - Token has expired
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `INTERNAL_ERROR` - Server error

---

## Database Schema

### Key Models

#### User

```prisma
model User {
  id          String   @id @default(uuid())
  email       String   @unique
  username    String   @unique
  isActive    Boolean  @default(true)
  lastLoginAt DateTime?
  // ... relations
}
```

#### RefreshToken

```prisma
model RefreshToken {
  id          String   @id @default(uuid())
  token       String   @unique
  userId      String
  sessionId   String
  deviceName  String?
  userAgent   String
  ipAddress   String
  expiresAt   DateTime
  lastUsed    DateTime
  // ... relations
}
```

#### OtpCode

```prisma
model OtpCode {
  id        String   @id @default(uuid())
  email     String
  code      String
  userId    String?
  attempts  Int      @default(0)
  isUsed    Boolean  @default(false)
  expiresAt DateTime
  // ... relations
}
```

---

## Development

### Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run check-types  # TypeScript type checking
npm run clean        # Clean build artifacts
```

### Database Operations

```bash
npx prisma migrate dev    # Run migrations
npx prisma generate      # Generate client
npx prisma studio        # Open database GUI
npx prisma db push       # Push schema changes
```

---

## Deployment

### Environment Setup

1. Set production environment variables
2. Run database migrations
3. Build the application
4. Start the server

### Health Monitoring

- **Health endpoint**: `/api/health` for load balancer checks
- **Cleanup service**: Automatic token cleanup every hour
- **Error logging**: Console logging (integrate with your monitoring)

---

## Frontend Integration

### Cookie Handling

```javascript
// Cookies are handled automatically by browser
// No manual management needed for refresh tokens

// API calls with access token
fetch("/api/protected", {
	headers: {
		Authorization: `Bearer ${accessToken}`,
	},
	credentials: "include", // Include cookies
});
```

### Token Refresh Flow

```javascript
// When access token expires, call refresh endpoint
const refreshResponse = await fetch("/api/auth/refresh", {
	method: "POST",
	credentials: "include", // Send refresh token cookie
});

if (refreshResponse.ok) {
	const { accessToken } = await refreshResponse.json();
	// Update stored access token and retry original request
}
```

This completes the comprehensive authentication system for the Ticket Dashboard backend! 🚀
