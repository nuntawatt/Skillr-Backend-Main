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

## Table of Contents

 - [Tech Stack](#tech-stack)
 - [Project Structure](#project-structure)
 - [Installation](#installation)
 - [Running the App](#running-the-app)
 - [Database Migrations](#database-migrations)
 - [API Documentation](#api-documentation)
 - [Testing](#testing)
 - [API Endpoints Summary](#api-endpoints-summary)
 - [Enums Reference](#enums-reference)
 
---

## Tech Stack
<a id="tech-stack"></a>

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
<a id="project-structure"></a>

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

<a id="installation"></a>

## Installation


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
<a id="running-the-app"></a>

---

## Running the App

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

<a id="database-migrations"></a>

## Database Migrations

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

<a id="api-documentation"></a>

## API Documentation

### Base URL

```
http://localhost:3000
```

---

### Authentication APIs

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

### User APIs

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

### Admin APIs

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

## User Roles

| Role | Description |
|------|-------------|
| `student` | Default role, can enroll in courses |
| `instructor` | Can create and manage courses |
| `admin` | Full system access |

---

<a id="testing"></a>

## Testing

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

<a id="api-endpoints-summary"></a>

## API Endpoints Summary

### Authentication (`/auth`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/auth/register` | สมัครสมาชิกใหม่ | No |
| `POST` | `/auth/login` | ล็อกอิน | No |
| `GET` | `/auth/google` | เริ่ม Google OAuth | No |
| `GET` | `/auth/google/callback` | Google OAuth callback | No |
| `POST` | `/auth/google/token` | แลกเปลี่ยน Google token | No |
| `POST` | `/auth/refresh` | รีเฟรช access token | No |
| `POST` | `/auth/logout` | ออกจากระบบ | Yes |
| `POST` | `/auth/forgot-password` | ขอรีเซ็ตรหัสผ่าน | No |
| `POST` | `/auth/reset-password` | รีเซ็ตรหัสผ่านด้วย token | No |

### Users (`/users`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/users/me` | ดูโปรไฟล์ตัวเอง | Yes |
| `PATCH` | `/users/me` | แก้ไขโปรไฟล์ตัวเอง | Yes |
| `GET` | `/users` | ดูผู้ใช้ทั้งหมด | Yes (Admin) |
| `GET` | `/users/:id` | ดูผู้ใช้ตาม ID | Yes (Admin) |
| `DELETE` | `/users/:id` | ลบผู้ใช้ | Yes (Admin) |

### Admin (`/admin`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `PATCH` | `/admin/users/:id/role` | เปลี่ยนบทบาทผู้ใช้ | Yes (Admin) |

### Students (`/students`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/students` | สร้างโปรไฟล์นักเรียน | Yes |
| `GET` | `/students` | ดูนักเรียนทั้งหมด | Yes (Admin) |
| `GET` | `/students/:id` | ดูข้อมูลนักเรียนตาม ID | Yes |
| `GET` | `/students/user/:userId` | ดูโปรไฟล์นักเรียนจาก userId | Yes |
| `PATCH` | `/students/:id` | อัปเดตโปรไฟล์นักเรียน | Yes |
| `DELETE` | `/students/:id` | ลบนักเรียน | Yes (Admin) |

### Instructors (`/instructors`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/instructors` | สร้างโปรไฟล์ผู้สอน | Yes |
| `GET` | `/instructors` | ดูผู้สอนทั้งหมด | No |
| `GET` | `/instructors/:id` | ดูผู้สอนตาม ID | No |
| `GET` | `/instructors/user/:userId` | ดูผู้สอนจาก userId | Yes |
| `PATCH` | `/instructors/:id` | อัปเดตโปรไฟล์ผู้สอน | Yes (Instructor) |
| `PATCH` | `/instructors/:id/verify` | ยืนยันผู้สอน | Yes (Admin) |
| `DELETE` | `/instructors/:id` | ลบผู้สอน | Yes (Admin) |

### Courses (`/courses`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/courses` | สร้างคอร์สใหม่ | Yes (Instructor) |
| `GET` | `/courses` | ดูคอร์สทั้งหมด | No |
| `GET` | `/courses/:id` | ดูรายละเอียดคอร์ส | NO |
| `GET` | `/courses/instructor/:instructorId` | ดูคอร์สตามผู้สอน | No |
| `PATCH` | `/courses/:id` | อัปเดตคอร์ส | Yes (Instructor) |
| `PATCH` | `/courses/:id/status` | อัปเดตสถานะคอร์ส | Yes (Instructor) |
| `DELETE` | `/courses/:id` | ลบคอร์ส | Yes (Instructor) |

### Lessons (`/lessons`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/lessons` | สร้างบทเรียนใหม่ | Yes (Instructor) |
| `GET` | `/lessons` | ดูบทเรียนทั้งหมด | Yes |
| `GET` | `/lessons/:id` | ดูบทเรียนตาม ID | Yes |
| `GET` | `/lessons/course/:courseId` | ดูบทเรียนตามคอร์ส | Yes |
| `PATCH` | `/lessons/:id` | อัปเดตบทเรียน | Yes (Instructor) |
| `PATCH` | `/lessons/:id/order` | เปลี่ยนลำดับบทเรียน | Yes (Instructor) |
| `DELETE` | `/lessons/:id` | ลบบทเรียน | Yes (Instructor) |

### Content (`/content`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/content` | สร้างคอนเทนต์ | Yes (Instructor) |
| `GET` | `/content` | ดูคอนเทนต์ทั้งหมด | Yes |
| `GET` | `/content/:id` | ดูคอนเทนต์ตาม ID | Yes |
| `GET` | `/content/lesson/:lessonId` | ดูคอนเทนต์ตามบทเรียน | Yes |
| `PATCH` | `/content/:id` | อัปเดตคอนเทนต์ | Yes (Instructor) |
| `DELETE` | `/content/:id` | ลบคอนเทนต์ | Yes (Instructor) |

### Assignments (`/assignments`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/assignments` | สร้างการบ้าน | Yes (Instructor) |
| `GET` | `/assignments` | ดูการบ้านทั้งหมด | Yes |
| `GET` | `/assignments/:id` | ดูการบ้าน | Yes |
| `GET` | `/assignments/course/:courseId` | ดูการบ้านตามคอร์ส | Yes |
| `PATCH` | `/assignments/:id` | อัปเดตการบ้าน | Yes (Instructor) |
| `DELETE` | `/assignments/:id` | ลบการบ้าน | Yes (Instructor) |
| `POST` | `/assignments/:id/submit` | ส่งการบ้าน | Yes (Student) |
| `GET` | `/assignments/:id/submissions` | ดูงานส่ง | Yes (Instructor) |
| `POST` | `/assignments/submissions/:submissionId/grade` | ให้คะแนน | Yes (Instructor) |

### Learning / Quizzes (`/learning`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/learning/quizzes` | สร้างแบบทดสอบ | Yes Instructor |
| `GET` | `/learning/quizzes` | ดูแบบทดสอบทั้งหมด | Yes |
| `GET` | `/learning/quizzes/:id` | ดูแบบทดสอบ | Yes |
| `GET` | `/learning/quizzes/lesson/:lessonId` | ดูแบบทดสอบตามบทเรียน | Yes |
| `PATCH` | `/learning/quizzes/:id` | อัปเดตแบบทดสอบ | Yes (Instructor) |
| `DELETE` | `/learning/quizzes/:id` | ลบแบบทดสอบ | Yes (Instructor) |
| `POST` | `/learning/quizzes/:id/start` | เริ่มทำแบบทดสอบ | Yes (Student) |
| `POST` | `/learning/quizzes/:id/submit` | ส่งคำตอบ | Yes (Student) |
| `GET` | `/learning/quizzes/:id/attempts` | ดูประวัติทำแบบทดสอบ | Yes |

### Enrollments (`/enrollments`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/enrollments` | ลงทะเบียนเรียน | Yes (Student) |
| `GET` | `/enrollments` | ดูการลงทะเบียนทั้งหมด | Yes (Admin) |
| `GET` | `/enrollments/:id` | ดูข้อมูลการลงทะเบียน | Yes |
| `GET` | `/enrollments/student/:studentId` | ดูตามนักเรียน | Yes |
| `GET` | `/enrollments/course/:courseId` | ดูตามคอร์ส | Yes (Instructor) |
| `PATCH` | `/enrollments/:id/status` | อัปเดตสถานะ | Yes |
| `PATCH` | `/enrollments/:id/progress` | อัปเดตความคืบหน้า | Yes (Student) |
| `DELETE` | `/enrollments/:id` | ยกเลิกการลงทะเบียน | Yes |

### Payments (`/payments`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/payments` | สร้างข้อมูลการชำระเงิน | Yes |
| `GET` | `/payments` | ดูการชำระเงินทั้งหมด | Yes (Admin) |
| `GET` | `/payments/:id` | ดูข้อมูลการชำระเงิน | Yes |
| `GET` | `/payments/user/:userId` | ดูการชำระเงินตามผู้ใช้ | Yes |
| `GET` | `/payments/enrollment/:enrollmentId` | ดูตามการลงทะเบียน | Yes |
| `PATCH` | `/payments/:id/status` | อัปเดตสถานะ | Yes (Admin) |
| `POST` | `/payments/:id/refund` | คืนเงิน | Yes (Admin) |

### Activities (`/activities`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/activities` | สร้างกิจกรรม | Yes (Instructor/Admin) |
| `GET` | `/activities` | ดูกิจกรรมทั้งหมด | No |
| `GET` | `/activities/:id` | ดูกิจกรรม | No |
| `GET` | `/activities/upcoming` | ดูกิจกรรมที่กำลังจะมาถึง | No |
| `PATCH` | `/activities/:id` | อัปเดตกิจกรรม | Yes (Instructor) |
| `DELETE` | `/activities/:id` | ลบกิจกรรม | Yes Admin |
| `POST` | `/activities/:id/register` | ลงทะเบียนเข้าร่วม | Yes |
| `DELETE` | `/activities/:id/register` | ยกเลิกการลงทะเบียน | Yes |
| `GET` | `/activities/:id/registrations` | ดูผู้ลงทะเบียน | Yes (Instructor) |

### Notifications (`/notifications`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/notifications` | สร้างการแจ้งเตือน | Yes (Admin) |
| `GET` | `/notifications` | ดูแจ้งเตือนของผู้ใช้ | Yes |
| `GET` | `/notifications/unread` | ดูจำนวนที่ยังไม่อ่าน | Yes |
| `GET` | `/notifications/:id` | ดูแจ้งเตือนตาม ID | Yes |
| `PATCH` | `/notifications/:id/read` | ทำเป็นอ่านแล้ว | Yes |
| `PATCH` | `/notifications/read-all` | ทำอ่านทั้งหมด | Yes |
| `DELETE` | `/notifications/:id` | ลบแจ้งเตือน | Yes |

---
<a id="enums-reference"></a>

## Enums Reference

### CourseStatus
| Value | Description |
|-------|-------------|
| `draft` | คอร์สกำลังพัฒนา |
| `published` | คอร์สเผยแพร่แล้ว |
| `archived` | คอร์สถูกเก็บถาวร |

### ContentType
| Value | Description |
|-------|-------------|
| `video` | วิดีโอ |
| `document` | เอกสาร/PDF |
| `image` | รูปภาพ |
| `audio` | ไฟล์เสียง |
| `embed` | เนื้อหาฝังตัว |
| `text` | ข้อความ |

### QuestionType
| Value | Description |
|-------|-------------|
| `multiple_choice` | คำถามหลายตัวเลือก |
| `true_false` | คำถามจริง/เท็จ |
| `short_answer` | คำถามตอบสั้น |

### EnrollmentStatus
| Value | Description |
|-------|-------------|
| `pending` | รอการชำระเงิน |
| `active` | กำลังเรียนอยู่ |
| `completed` | เรียนจบแล้ว |
| `cancelled` | ยกเลิกแล้ว |

### PaymentStatus
| Value | Description |
|-------|-------------|
| `pending` | รอดำเนินการ |
| `completed` | ชำระเงินสำเร็จ |
| `failed` | ชำระเงินล้มเหลว |
| `refunded` | คืนเงินแล้ว |
| `cancelled` | ยกเลิกแล้ว |

### PaymentMethod
| Value | Description |
|-------|-------------|
| `qr` | ชำระผ่าน QR Code |
| `card` | บัตรเครดิต/เดบิต |
| `manual` | โอนเงินด้วยตนเอง |
| `bank_transfer` | โอนผ่านธนาคาร |

### ActivityType
| Value | Description |
|-------|-------------|
| `workshop` | เวิร์คช็อป |
| `webinar` | เว็บบินาร์ |
| `meetup` | พบปะ |
| `hackathon` | แฮกกาธอน |
| `other` | อื่นๆ |

### NotificationType
| Value | Description |
|-------|-------------|
| `info` | ข้อมูลทั่วไป |
| `success` | แจ้งเตือนสำเร็จ |
| `warning` | แจ้งเตือนระวัง |
| `error` | แจ้งเตือนข้อผิดพลาด |

---