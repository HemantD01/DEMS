# 🔐 DEMS — Digital Evidence Management System

A secure, full-stack web application for managing digital evidence in investigations with **chain of custody tracking**, **SHA-256 integrity verification**, and **role-based access control**.

---

## 🏗 Tech Stack

| Layer      | Technology                                |
|------------|-------------------------------------------|
| Frontend   | React 18, Tailwind CSS, React Router v6   |
| Backend    | Node.js, Express.js                       |
| Database   | PostgreSQL                                |
| Security   | JWT Auth, bcrypt, SHA-256 (crypto module) |
| File Upload| Multer (multipart/form-data)              |

---

## 📁 Project Structure

```
dems/
├── backend/
│   ├── database/
│   │   └── schema.sql          # DB schema + seed data
│   ├── middleware/
│   │   └── auth.js             # JWT auth middleware
│   ├── models/
│   │   └── db.js               # PostgreSQL pool
│   ├── routes/
│   │   ├── auth.js             # Login, logout, password
│   │   ├── cases.js            # Case CRUD
│   │   ├── evidence.js         # Upload, verify, download, custody
│   │   ├── users.js            # User management (admin)
│   │   └── dashboard.js        # Stats + audit logs
│   ├── utils/
│   │   ├── audit.js            # Audit log + custody helpers
│   │   └── hash.js             # SHA-256 file hashing
│   ├── .env.example
│   ├── package.json
│   └── server.js               # Express app entry point
│
└── frontend/
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── components/layout/
    │   │   └── Layout.jsx       # Sidebar + nav
    │   ├── context/
    │   │   └── AuthContext.jsx  # Auth state management
    │   ├── pages/
    │   │   ├── LoginPage.jsx
    │   │   ├── DashboardPage.jsx
    │   │   ├── CasesPage.jsx
    │   │   ├── CaseDetailPage.jsx
    │   │   ├── EvidencePage.jsx
    │   │   ├── EvidenceDetailPage.jsx
    │   │   ├── UploadEvidencePage.jsx
    │   │   ├── AuditLogsPage.jsx
    │   │   └── UsersPage.jsx
    │   ├── utils/
    │   │   ├── api.js           # Axios instance
    │   │   └── helpers.js       # Date, hash, badge utils
    │   ├── App.jsx              # Routes
    │   └── index.css            # Tailwind + custom styles
    ├── package.json
    └── tailwind.config.js
```

---

## ⚙️ Setup Instructions

### Prerequisites
- Node.js v18+
- PostgreSQL 14+
- npm or yarn

---

### 1. Database Setup

```bash
# Create database
psql -U postgres -c "CREATE DATABASE dems_db;"

# Run schema (creates all tables + seed users)
psql -U postgres -d dems_db -f backend/database/schema.sql
```

---

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env from template
cp .env.example .env
```

Edit `.env`:
```env
PORT=5000
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/dems_db
JWT_SECRET=your_super_secret_key_at_least_32_chars
JWT_EXPIRES_IN=24h
UPLOAD_DIR=uploads
MAX_FILE_SIZE=52428800
FRONTEND_URL=http://localhost:3000
```

```bash
# Start backend (development)
npm run dev

# Start backend (production)
npm start
```

Backend runs at: **http://localhost:5000**

---

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

Frontend runs at: **http://localhost:3000**

---

## 🔑 Default Login Credentials

| Role          | Username       | Password      |
|---------------|----------------|---------------|
| Admin         | `admin`        | `Admin@123`   |
| Investigator  | `investigator1`| `Invest@123`  |

> ⚠️ Change these passwords immediately in production!

---

## 🌟 Core Features

### 🔒 Authentication & RBAC
- JWT-based stateless authentication
- Two roles: **Admin** and **Investigator**
- Admins: full access + user management + audit logs
- Investigators: case/evidence access based on assignment

### 📁 Evidence Management
- File upload with metadata (title, description, tags, case)
- **Automatic SHA-256 hash generation** on every upload
- Support for: images, PDF, documents, zip, video, audio, CSV/JSON
- Max file size: 50MB

### 🔍 Integrity Verification
- One-click verify button re-hashes file and compares
- Tampered files automatically flagged with `tampered` status
- Visual alert banners for compromised evidence
- Hash mismatch details shown to investigators

### ⛓️ Chain of Custody
- Every evidence action is logged: **upload → view → download → verify**
- Tracks: user identity, timestamp, IP address, user agent, badge number
- Immutable timeline visible on evidence detail page
- Actions: `upload`, `view`, `download`, `verify`, `update`, `archive`, `tamper_detected`

### 📊 Dashboard
- Live stats: active cases, evidence count, integrity status
- Case status breakdown with visual progress bars
- Recent activity feed
- Integrity alert banner when tampering detected

### 📋 Audit Logs (Admin)
- System-wide log of all actions
- Filterable by action type, status
- Records user, timestamp, IP, resource
- Pagination for large datasets

---

## 🔌 API Reference

### Auth
```
POST /api/auth/login           - Login
GET  /api/auth/me              - Current user
POST /api/auth/logout          - Logout
POST /api/auth/change-password - Change password
```

### Cases
```
GET    /api/cases              - List cases (filterable)
GET    /api/cases/:id          - Case detail + evidence
POST   /api/cases              - Create case
PUT    /api/cases/:id          - Update case
```

### Evidence
```
GET    /api/evidence           - List evidence (filterable)
GET    /api/evidence/:id       - Evidence detail + custody log
POST   /api/evidence/upload    - Upload file (multipart/form-data)
POST   /api/evidence/:id/verify  - Run integrity check
GET    /api/evidence/:id/download - Download file
GET    /api/evidence/:id/custody  - Chain of custody
```

### Dashboard
```
GET    /api/dashboard/stats       - Summary statistics
GET    /api/dashboard/audit-logs  - Audit logs (admin)
```

### Users (Admin)
```
GET    /api/users              - List all users
POST   /api/users              - Create user
PUT    /api/users/:id/toggle   - Enable/disable user
```

---

## 🛡️ Security Implementation

| Concern              | Implementation                              |
|----------------------|---------------------------------------------|
| Password storage     | bcrypt with cost factor 12                  |
| Authentication       | JWT signed with HS256, 24h expiry           |
| File integrity       | SHA-256 hash (Node.js `crypto` module)      |
| Access control       | Role-based middleware on every route        |
| Input validation     | Server-side checks on all endpoints         |
| File type filtering  | MIME type allowlist in multer               |
| Audit trail          | Every action logged with user + IP + agent  |

---

## 🚀 Future Enhancements (as noted in project)

- [ ] AI anomaly detection (unusual access patterns)
- [ ] Real-time notifications (WebSocket)
- [ ] Advanced reporting & PDF export
- [ ] Digital signatures for evidence
- [ ] Two-factor authentication (2FA)
- [ ] Evidence categorization by type of crime
- [ ] Case assignment workflow + email notifications

---

## 📝 Database Schema Overview

```
users ──────────────────────────────────────────┐
  id, username, email, password_hash             │
  role (admin|investigator)                      │
  full_name, badge_number, department            │
  is_active, created_at, last_login              │
                                                 │
cases ──────────────────┐                        │
  id, case_number        │                       │
  title, description     │                       │
  status, priority       │                       │
  created_by ────────────┼───────────────────────┘
  assigned_to ───────────┘
        │
        │
evidence ─────────────────────────────────────────┐
  id, case_id (FK → cases)                        │
  evidence_number, title, description             │
  file_name, original_name, file_path             │
  file_type, file_size, mime_type                 │
  sha256_hash  ← INTEGRITY ANCHOR                 │
  status (active|tampered|archived)               │
  uploaded_by ─────────────────────────────────── ┘
        │
        │
chain_of_custody ────────────────────────────────
  id, evidence_id (FK)
  action (upload|view|download|verify|tamper_detected)
  performed_by (FK → users)
  performed_at, ip_address, user_agent
  notes, hash_at_time

audit_logs ──────────────────────────────────────
  id, user_id, action, resource_type, resource_id
  details (JSONB), ip_address, status, created_at
```
