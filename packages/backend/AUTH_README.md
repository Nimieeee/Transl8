# Authentication System

This document describes the authentication and user management system implemented for the AI Video Dubbing Platform.

## Overview

The authentication system provides secure user registration, login, and session management using JWT tokens and Redis for token storage.

## Features

### 1. User Registration (`POST /api/auth/register`)
- Email validation (proper email format)
- Strong password requirements:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character
- Password hashing using bcrypt with cost factor 12
- Automatic JWT token generation upon registration
- Default free tier subscription

### 2. User Login (`POST /api/auth/login`)
- Email and password authentication
- Secure password comparison using bcrypt
- JWT access token (15 minute expiry)
- JWT refresh token (7 day expiry)
- Refresh tokens stored in Redis for validation

### 3. Token Refresh (`POST /api/auth/refresh`)
- Refresh access tokens using valid refresh tokens
- Validates refresh token exists in Redis
- Generates new token pair
- Invalidates old refresh token

### 4. Logout (`POST /api/auth/logout`)
- Invalidates specific refresh token or all user tokens
- Requires authentication

### 5. Get Current User (`GET /api/auth/me`)
- Returns current user information
- Requires authentication

## Authentication Middleware

### `authenticateToken`
Verifies JWT access token and attaches user information to the request object.

Usage:
```typescript
import { authenticateToken } from './middleware/auth';

router.get('/protected', authenticateToken, (req, res) => {
  // req.user contains the authenticated user's information
  res.json({ userId: req.user.userId });
});
```

### `requireSubscriptionTier`
Checks if the authenticated user has the required subscription tier.

Usage:
```typescript
import { authenticateToken, requireSubscriptionTier } from './middleware/auth';

router.post(
  '/premium-feature',
  authenticateToken,
  requireSubscriptionTier('PRO', 'ENTERPRISE'),
  (req, res) => {
    // Only PRO and ENTERPRISE users can access this
  }
);
```

### `optionalAuth`
Attaches user information if a valid token is provided, but doesn't require authentication.

## Security Features

1. **Password Hashing**: Bcrypt with cost factor 12
2. **JWT Tokens**: 
   - Access tokens expire in 15 minutes
   - Refresh tokens expire in 7 days
3. **Token Storage**: Refresh tokens stored in Redis with automatic expiry
4. **Token Invalidation**: Logout invalidates refresh tokens
5. **Input Validation**: Zod schemas for request validation
6. **Error Handling**: Consistent error responses with codes

## API Endpoints

### Register
```
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

Response: 201 Created
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "subscriptionTier": "FREE",
    "processingMinutesUsed": 0,
    "processingMinutesLimit": 10,
    "voiceCloneSlots": 0
  },
  "tokens": {
    "accessToken": "jwt-access-token",
    "refreshToken": "jwt-refresh-token"
  }
}
```

### Login
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

Response: 200 OK
{
  "user": { ... },
  "tokens": { ... }
}
```

### Refresh Token
```
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "jwt-refresh-token"
}

Response: 200 OK
{
  "tokens": {
    "accessToken": "new-jwt-access-token",
    "refreshToken": "new-jwt-refresh-token"
  }
}
```

### Logout
```
POST /api/auth/logout
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "refreshToken": "jwt-refresh-token"  // Optional
}

Response: 200 OK
{
  "message": "Logged out successfully"
}
```

### Get Current User
```
GET /api/auth/me
Authorization: Bearer <access-token>

Response: 200 OK
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "subscriptionTier": "FREE",
    "processingMinutesUsed": 0,
    "processingMinutesLimit": 10,
    "voiceCloneSlots": 0,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

## Error Responses

All errors follow a consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {},  // Optional additional details
    "retryable": false
  }
}
```

Common error codes:
- `VALIDATION_ERROR`: Invalid input data
- `USER_EXISTS`: Email already registered
- `INVALID_CREDENTIALS`: Wrong email or password
- `NO_TOKEN`: Missing access token
- `INVALID_TOKEN`: Invalid or expired access token
- `INVALID_REFRESH_TOKEN`: Invalid or expired refresh token
- `REFRESH_TOKEN_REVOKED`: Refresh token has been invalidated
- `UNAUTHORIZED`: Authentication required
- `INSUFFICIENT_TIER`: Subscription tier too low
- `INTERNAL_ERROR`: Server error

## Environment Variables

Required environment variables in `.env`:

```
JWT_SECRET=your-secret-key-change-in-production
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
```

## Requirements Satisfied

This implementation satisfies the following requirements from the specification:

- **Requirement 10.1**: User registration with email and password
- **Requirement 10.2**: Email format and password strength validation
- **Requirement 10.3**: User login with JWT token generation
- **Requirement 10.4**: Secure password storage using bcrypt
- **Requirement 10.5**: Secure session management with Redis

## Testing

To test the authentication system:

1. Start the backend server:
   ```bash
   npm run dev
   ```

2. Register a new user:
   ```bash
   curl -X POST http://localhost:3001/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"SecurePass123!"}'
   ```

3. Login:
   ```bash
   curl -X POST http://localhost:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"SecurePass123!"}'
   ```

4. Access protected route:
   ```bash
   curl -X GET http://localhost:3001/api/auth/me \
     -H "Authorization: Bearer <access-token>"
   ```
