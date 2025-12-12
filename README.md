<h1 align="center">
  🎓 Project Skillr - Backend API
</h1>

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

<p align="center">
  A powerful learning management system API built with NestJS, TypeORM, and PostgreSQL
</p>

---

## 📚 Table of Contents

- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Installation](#-installation)
- [Environment Variables](#-environment-variables)
- [Running the App](#-running-the-app)
- [Database Migrations](#-database-migrations)
- [API Documentation](#-api-documentation)
- [Testing](#-testing)

---

## 🛠 Tech Stack

| Technology | Purpose |
|------------|---------|
| **NestJS** | Backend Framework |
| **TypeORM** | ORM for PostgreSQL |
| **PostgreSQL** | Database |
| **JWT** | Authentication |
| **Argon2** | Password Hashing |
| **class-validator** | DTO Validation |
| **Passport** | Authentication Strategies |

---

## 📁 Project Structure

```
src/
├── main.ts                      # Application entry point
├── app.module.ts                # Root module
├── config/
│   ├── index.ts
│   ├── database.config.ts       # Database configuration
│   └── jwt.config.ts            # JWT configuration
├── common/
│   ├── decorators/              # Custom decorators
│   ├── enums/                   # Enums (UserRole, AuthProvider)
│   ├── filters/                 # Exception filters
│   ├── guards/                  # Global guards
│   ├── interceptors/            # Response interceptors
│   └── utils/                   # Utility functions
├── database/
│   ├── migrations/              # TypeORM migrations
│   └── seeds/                   # Database seeders
├── modules/
│   ├── auth/                    # Authentication module
│   ├── users/                   # Users management
│   ├── students/                # Student profiles
│   ├── instructors/             # Instructor profiles
│   ├── courses/                 # Course management
│   ├── lessons/                 # Lesson content
│   ├── content/                 # Media & content items
│   ├── assignments/             # Assignments & submissions
│   ├── learning/                # Quizzes & assessments
│   ├── enrollments/             # Course enrollments
│   ├── payments/                # Payment processing
│   ├── activities/              # Learning activities
│   └── notifications/           # User notifications
└── scripts/                     # Utility scripts
```

---

## 🚀 Installation

### Prerequisites

- Node.js >= 18.x
- PostgreSQL >= 14.x
- npm or yarn

### Install Dependencies

```bash
# Install all packages
npm install

# Or with yarn
yarn install
```

### Required Packages

```bash
npm install @nestjs/common @nestjs/core @nestjs/platform-express
npm install @nestjs/typeorm typeorm pg
npm install @nestjs/config @nestjs/jwt @nestjs/passport
npm install passport passport-jwt passport-google-oauth20
npm install class-validator class-transformer
npm install argon2 uuid
npm install @nestjs/swagger swagger-ui-express
```

---

## ⚙️ Environment Variables

Create a `.env` file in the root directory:

```env
# Application
NODE_ENV=development
PORT=3000

# Database (Option 1: Connection URL)
DATABASE_URL=postgresql://username:password@localhost:5432/skillr

# Database (Option 2: Individual settings)
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=password
DB_NAME=skillr
DB_LOG=false

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# Frontend URL (for OAuth redirects)
FRONTEND_URL=http://localhost:3000
```

---

## 🏃 Running the App

```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod

# Debug mode
npm run start:debug
```

---

## 🗃 Database Migrations

```bash
# Generate a new migration
npx typeorm migration:generate src/database/migrations/MigrationName -d src/config/typeorm.config.ts

# Run migrations
npx typeorm migration:run -d src/config/typeorm.config.ts

# Revert last migration
npx typeorm migration:revert -d src/config/typeorm.config.ts
```

> ⚠️ **Production Note**: Always set `synchronize: false` in production and use migrations.

---

## 📖 API Documentation

### Base URL

```
http://localhost:3000
```

---

### 🔐 Authentication APIs

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "student",
    "isVerified": false,
    "createdAt": "2025-12-12T00:00:00.000Z"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "refresh-token-string",
    "expiresIn": 900
  }
}
```

---

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "rememberMe": true
}
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "student"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "refresh-token-string",
    "expiresIn": 900
  }
}
```

---

#### Google OAuth - Initiate
```http
GET /auth/google
```
Redirects to Google OAuth consent screen.

---

#### Google OAuth - Token Exchange
```http
POST /auth/google/token
Content-Type: application/json

{
  "id_token": "google-id-token"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@gmail.com",
    "firstName": "John",
    "lastName": "Doe",
    "provider": "google"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "refresh-token-string",
    "expiresIn": 900
  }
}
```

---

#### Refresh Token
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

**Response (200):**
```json
{
  "accessToken": "new-access-token",
  "refreshToken": "new-refresh-token",
  "expiresIn": 900
}
```

---

#### Logout
```http
POST /auth/logout
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

---

#### Forgot Password
```http
POST /auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "message": "If the email exists, a password reset link will be sent."
}
```

---

#### Reset Password
```http
POST /auth/reset-password
Content-Type: application/json

{
  "token": "reset-token-from-email",
  "newPassword": "newpassword123"
}
```

**Response (200):**
```json
{
  "message": "Password has been reset successfully"
}
```

---

### 👤 User APIs

#### Get Current User Profile
```http
GET /users/me
Authorization: Bearer <access-token>
```

**Response (200):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "avatar": null,
  "role": "student",
  "provider": "local",
  "isVerified": false,
  "createdAt": "2025-12-12T00:00:00.000Z",
  "updatedAt": "2025-12-12T00:00:00.000Z"
}
```

---

#### Update Current User Profile
```http
PATCH /users/me
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "firstName": "Johnny",
  "lastName": "Smith",
  "avatar": "https://example.com/avatar.jpg"
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "firstName": "Johnny",
  "lastName": "Smith",
  "avatar": "https://example.com/avatar.jpg",
  "role": "student",
  "updatedAt": "2025-12-12T00:00:00.000Z"
}
```

---

### 🔒 Admin APIs

#### Get All Users (Admin Only)
```http
GET /users
Authorization: Bearer <admin-access-token>
```

**Response (200):**
```json
[
  {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "student",
    "createdAt": "2025-12-12T00:00:00.000Z"
  }
]
```

---

#### Get User by ID (Admin Only)
```http
GET /users/:id
Authorization: Bearer <admin-access-token>
```

---

#### Delete User (Admin Only)
```http
DELETE /users/:id
Authorization: Bearer <admin-access-token>
```

**Response (204):** No Content

---

#### Update User Role (Admin Only)
```http
PATCH /admin/users/:id/role
Authorization: Bearer <admin-access-token>
Content-Type: application/json

{
  "role": "instructor"
}
```

**Response (200):**
```json
{
  "message": "User role updated successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "instructor"
  }
}
```

---

## 📊 API Response Status Codes

| Status Code | Description |
|-------------|-------------|
| `200` | Success |
| `201` | Created |
| `204` | No Content |
| `400` | Bad Request - Invalid input |
| `401` | Unauthorized - Invalid/missing token |
| `403` | Forbidden - Insufficient permissions |
| `404` | Not Found |
| `409` | Conflict - Resource already exists |
| `500` | Internal Server Error |

---

## 🔑 User Roles

| Role | Description |
|------|-------------|
| `student` | Default role, can enroll in courses |
| `instructor` | Can create and manage courses |
| `admin` | Full system access |

---

## 🧪 Testing

```bash
# Unit tests
npm run test

# End-to-end tests
npm run test:e2e

# Test coverage
npm run test:cov

# Watch mode
npm run test:watch
```

---

## 📝 API Endpoints Summary

### Authentication (`/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/auth/register` | Register new user | ❌ |
| `POST` | `/auth/login` | Login with email/password | ❌ |
| `GET` | `/auth/google` | Initiate Google OAuth | ❌ |
| `GET` | `/auth/google/callback` | Google OAuth callback | ❌ |
| `POST` | `/auth/google/token` | Exchange Google token | ❌ |
| `POST` | `/auth/refresh` | Refresh access token | ❌ |
| `POST` | `/auth/logout` | Logout user | ✅ |
| `POST` | `/auth/forgot-password` | Request password reset | ❌ |
| `POST` | `/auth/reset-password` | Reset password with token | ❌ |

### Users (`/users`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/users/me` | Get current user profile | ✅ |
| `PATCH` | `/users/me` | Update current user profile | ✅ |
| `GET` | `/users` | Get all users | ✅ Admin |
| `GET` | `/users/:id` | Get user by ID | ✅ Admin |
| `DELETE` | `/users/:id` | Delete user | ✅ Admin |

### Admin (`/admin`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `PATCH` | `/admin/users/:id/role` | Update user role | ✅ Admin |

### Students (`/students`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/students` | Create student profile | ✅ |
| `GET` | `/students` | Get all students | ✅ Admin |
| `GET` | `/students/:id` | Get student by ID | ✅ |
| `GET` | `/students/user/:userId` | Get student by user ID | ✅ |
| `PATCH` | `/students/:id` | Update student profile | ✅ |
| `DELETE` | `/students/:id` | Delete student profile | ✅ Admin |

### Instructors (`/instructors`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/instructors` | Create instructor profile | ✅ |
| `GET` | `/instructors` | Get all instructors | ❌ |
| `GET` | `/instructors/:id` | Get instructor by ID | ❌ |
| `GET` | `/instructors/user/:userId` | Get instructor by user ID | ✅ |
| `PATCH` | `/instructors/:id` | Update instructor profile | ✅ Instructor |
| `PATCH` | `/instructors/:id/verify` | Verify instructor | ✅ Admin |
| `DELETE` | `/instructors/:id` | Delete instructor profile | ✅ Admin |

### Courses (`/courses`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/courses` | Create new course | ✅ Instructor |
| `GET` | `/courses` | Get all published courses | ❌ |
| `GET` | `/courses/:id` | Get course by ID | ❌ |
| `GET` | `/courses/instructor/:instructorId` | Get courses by instructor | ❌ |
| `PATCH` | `/courses/:id` | Update course | ✅ Instructor |
| `PATCH` | `/courses/:id/status` | Update course status | ✅ Instructor |
| `DELETE` | `/courses/:id` | Delete course | ✅ Instructor |

### Lessons (`/lessons`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/lessons` | Create new lesson | ✅ Instructor |
| `GET` | `/lessons` | Get all lessons | ✅ |
| `GET` | `/lessons/:id` | Get lesson by ID | ✅ |
| `GET` | `/lessons/course/:courseId` | Get lessons by course | ✅ |
| `PATCH` | `/lessons/:id` | Update lesson | ✅ Instructor |
| `PATCH` | `/lessons/:id/order` | Reorder lesson | ✅ Instructor |
| `DELETE` | `/lessons/:id` | Delete lesson | ✅ Instructor |

### Content (`/content`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/content` | Create content item | ✅ Instructor |
| `GET` | `/content` | Get all content | ✅ |
| `GET` | `/content/:id` | Get content by ID | ✅ |
| `GET` | `/content/lesson/:lessonId` | Get content by lesson | ✅ |
| `PATCH` | `/content/:id` | Update content | ✅ Instructor |
| `DELETE` | `/content/:id` | Delete content | ✅ Instructor |

### Assignments (`/assignments`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/assignments` | Create assignment | ✅ Instructor |
| `GET` | `/assignments` | Get all assignments | ✅ |
| `GET` | `/assignments/:id` | Get assignment by ID | ✅ |
| `GET` | `/assignments/course/:courseId` | Get assignments by course | ✅ |
| `PATCH` | `/assignments/:id` | Update assignment | ✅ Instructor |
| `DELETE` | `/assignments/:id` | Delete assignment | ✅ Instructor |
| `POST` | `/assignments/:id/submit` | Submit assignment | ✅ Student |
| `GET` | `/assignments/:id/submissions` | Get all submissions | ✅ Instructor |
| `POST` | `/assignments/submissions/:submissionId/grade` | Grade submission | ✅ Instructor |

### Learning / Quizzes (`/learning`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/learning/quizzes` | Create quiz | ✅ Instructor |
| `GET` | `/learning/quizzes` | Get all quizzes | ✅ |
| `GET` | `/learning/quizzes/:id` | Get quiz by ID | ✅ |
| `GET` | `/learning/quizzes/lesson/:lessonId` | Get quizzes by lesson | ✅ |
| `PATCH` | `/learning/quizzes/:id` | Update quiz | ✅ Instructor |
| `DELETE` | `/learning/quizzes/:id` | Delete quiz | ✅ Instructor |
| `POST` | `/learning/quizzes/:id/start` | Start quiz attempt | ✅ Student |
| `POST` | `/learning/quizzes/:id/submit` | Submit quiz answers | ✅ Student |
| `GET` | `/learning/quizzes/:id/attempts` | Get quiz attempts | ✅ |

### Enrollments (`/enrollments`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/enrollments` | Enroll in course | ✅ Student |
| `GET` | `/enrollments` | Get all enrollments | ✅ Admin |
| `GET` | `/enrollments/:id` | Get enrollment by ID | ✅ |
| `GET` | `/enrollments/student/:studentId` | Get enrollments by student | ✅ |
| `GET` | `/enrollments/course/:courseId` | Get enrollments by course | ✅ Instructor |
| `PATCH` | `/enrollments/:id/status` | Update enrollment status | ✅ |
| `PATCH` | `/enrollments/:id/progress` | Update progress | ✅ Student |
| `DELETE` | `/enrollments/:id` | Cancel enrollment | ✅ |

### Payments (`/payments`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/payments` | Create payment | ✅ |
| `GET` | `/payments` | Get all payments | ✅ Admin |
| `GET` | `/payments/:id` | Get payment by ID | ✅ |
| `GET` | `/payments/user/:userId` | Get payments by user | ✅ |
| `GET` | `/payments/enrollment/:enrollmentId` | Get payments by enrollment | ✅ |
| `PATCH` | `/payments/:id/status` | Update payment status | ✅ Admin |
| `POST` | `/payments/:id/refund` | Process refund | ✅ Admin |

### Activities (`/activities`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/activities` | Create activity | ✅ Instructor/Admin |
| `GET` | `/activities` | Get all activities | ❌ |
| `GET` | `/activities/:id` | Get activity by ID | ❌ |
| `GET` | `/activities/upcoming` | Get upcoming activities | ❌ |
| `PATCH` | `/activities/:id` | Update activity | ✅ Instructor |
| `DELETE` | `/activities/:id` | Delete activity | ✅ Admin |
| `POST` | `/activities/:id/register` | Register for activity | ✅ |
| `DELETE` | `/activities/:id/register` | Cancel registration | ✅ |
| `GET` | `/activities/:id/registrations` | Get activity registrations | ✅ Instructor |

### Notifications (`/notifications`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/notifications` | Create notification | ✅ Admin |
| `GET` | `/notifications` | Get user notifications | ✅ |
| `GET` | `/notifications/unread` | Get unread count | ✅ |
| `GET` | `/notifications/:id` | Get notification by ID | ✅ |
| `PATCH` | `/notifications/:id/read` | Mark as read | ✅ |
| `PATCH` | `/notifications/read-all` | Mark all as read | ✅ |
| `DELETE` | `/notifications/:id` | Delete notification | ✅ |

---

## 📊 Enums Reference

### CourseStatus
| Value | Description |
|-------|-------------|
| `draft` | Course in development |
| `published` | Course is live |
| `archived` | Course is archived |

### ContentType
| Value | Description |
|-------|-------------|
| `video` | Video content |
| `document` | Document/PDF |
| `image` | Image file |
| `audio` | Audio file |
| `embed` | Embedded content |
| `text` | Text content |

### QuestionType
| Value | Description |
|-------|-------------|
| `multiple_choice` | Multiple choice question |
| `true_false` | True/False question |
| `short_answer` | Short answer question |

### EnrollmentStatus
| Value | Description |
|-------|-------------|
| `pending` | Awaiting payment |
| `active` | Currently enrolled |
| `completed` | Course completed |
| `cancelled` | Enrollment cancelled |

### PaymentStatus
| Value | Description |
|-------|-------------|
| `pending` | Payment pending |
| `completed` | Payment successful |
| `failed` | Payment failed |
| `refunded` | Payment refunded |
| `cancelled` | Payment cancelled |

### PaymentMethod
| Value | Description |
|-------|-------------|
| `qr` | QR Code payment |
| `card` | Credit/Debit card |
| `manual` | Manual/Bank transfer |
| `bank_transfer` | Direct bank transfer |

### ActivityType
| Value | Description |
|-------|-------------|
| `workshop` | Workshop |
| `webinar` | Webinar |
| `meetup` | Meetup |
| `hackathon` | Hackathon |
| `other` | Other activity |

### NotificationType
| Value | Description |
|-------|-------------|
| `info` | Informational |
| `success` | Success message |
| `warning` | Warning message |
| `error` | Error message |

---

---

## 📄 License

This project is [UNLICENSED](LICENSE).

---

<p align="center">
  Made with ❤️ by Skillr Team
</p>

