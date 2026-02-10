# User Service - Port 8004

SoulBuddy User Authentication and Management Service with Supabase PostgreSQL integration.

## Features

- ✅ User Registration with email validation
- ✅ User Login with JWT authentication
- ✅ Password hashing with bcrypt
- ✅ Get current user profile
- ✅ Get user by ID
- ✅ Supabase PostgreSQL database integration

## Setup

### 1. Install Dependencies

```bash
cd backend-services/user-service
pip install -r requirements.txt
```

### 2. Configure Database

Edit the `.env` file and add your Supabase credentials:

```env
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.csppphbxhszqpbfrwqgk.supabase.co:5432/postgres
SECRET_KEY=your-secret-key-here-change-this-to-a-random-string
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

**Important:** Replace `[YOUR-PASSWORD]` with your actual Supabase database password!

### 3. Run the Service

```bash
python main.py
```

The service will run on `http://localhost:8004`

## API Endpoints

### Health Check
```
GET /health
```

### Register User
```
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "username",
  "password": "securepassword",
  "full_name": "John Doe"
}

Response:
{
  "access_token": "eyJhbGc...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "username",
    "full_name": "John Doe",
    "is_active": true,
    "created_at": "2026-02-11T..."
  }
}
```

### Login User
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}

Response:
{
  "access_token": "eyJhbGc...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "username",
    "full_name": "John Doe",
    "is_active": true,
    "created_at": "2026-02-11T..."
  }
}
```

### Get Current User
```
GET /api/auth/me
Authorization: Bearer <access_token>

Response:
{
  "id": 1,
  "email": "user@example.com",
  "username": "username",
  "full_name": "John Doe",
  "is_active": true,
  "created_at": "2026-02-11T..."
}
```

### Get User by ID
```
GET /api/users/{user_id}
Authorization: Bearer <access_token>

Response:
{
  "id": 1,
  "email": "user@example.com",
  "username": "username",
  "full_name": "John Doe",
  "is_active": true,
  "created_at": "2026-02-11T..."
}
```

## Frontend Integration

Use the `AuthService` in your React Native app:

```typescript
import { AuthService } from '@/services/authService';

// Register
const authData = await AuthService.register({
  email: 'user@example.com',
  username: 'username',
  password: 'password',
  full_name: 'John Doe'
});

// Login
const authData = await AuthService.login({
  email: 'user@example.com',
  password: 'password'
});

// Get current user
const user = await AuthService.getCurrentUser();

// Check if authenticated
const isAuth = await AuthService.isAuthenticated();

// Logout
await AuthService.logout();

// Make authenticated request
const response = await AuthService.authenticatedFetch(url, options);
```

## Database Schema

The service automatically creates a `users` table with:
- `id` (Primary Key)
- `email` (Unique, Indexed)
- `username` (Unique, Indexed)
- `full_name`
- `hashed_password`
- `is_active`
- `created_at`
- `updated_at`

## Security Features

- ✅ Password hashing with bcrypt
- ✅ JWT token authentication
- ✅ Token expiration (30 minutes by default)
- ✅ CORS enabled for frontend integration
- ✅ Email validation
- ✅ Duplicate email/username checking

## Testing

Use curl or Postman to test the endpoints:

```bash
# Register
curl -X POST http://localhost:8004/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","username":"testuser","password":"password123"}'

# Login
curl -X POST http://localhost:8004/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## Troubleshooting

### Database Connection Error
- Check your Supabase password in `.env`
- Verify Supabase project is running
- Check network connectivity

### Token Expired
- Tokens expire after 30 minutes
- User needs to login again
- Adjust `ACCESS_TOKEN_EXPIRE_MINUTES` in `.env` if needed

### Import Errors
- Ensure all dependencies are installed: `pip install -r requirements.txt`
- Use Python 3.8 or higher

