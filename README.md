# RideNow – Full-Stack Ride Booking Application

RideNow is a full-stack ride-hailing application that connects customers and drivers through a modern digital platform. Customers can book rides and track their ride status, while drivers can manage their availability and accept or complete ride requests.

The project includes separate applications for customers, drivers, and administrators, all connected to a centralized backend API. It features secure JWT authentication, role-based access control, ride lifecycle management, fare estimation, configurable pricing in Indian Rupees (INR), and an admin dashboard for managing users, rides, and platform operations.

**Technology Stack:** React, React Native, Node.js, TypeScript, PostgreSQL, Prisma, Docker, and JWT Authentication.

# RideNow - Production-Style Ride-Booking Platform

RideNow is a complete production-style ride-booking platform consisting of four main applications:

1. **`backend/`**: Node.js, TypeScript, and Express.js API using PostgreSQL with Prisma ORM.
2. **`customer-web/`**: React web application for customers to book rides, request vehicles, and track their driver.
3. **`driver-mobile/`**: React Native mobile application for drivers to toggle online status, accept rides, and handle driving transitions.
4. **`admin-web/`**: React dashboard for system administrators to manage pricing, approve drivers, and monitor rides.

## Workspace Layout
```
ridenow/
├── backend/            # Backend REST API + Socket.IO server
├── customer-web/       # Customer Web App (Vite + React)
├── driver-mobile/      # Driver Mobile App (React Native CLI)
├── admin-web/          # Admin Web App (Vite + React)
└── README.md           # This workspace documentation
```

Detailed setup, environment configs, database migrations, and scripts can be found in each respective application directory.

## Database Pre-requisites & Configuration

### 1. PostgreSQL Installation
The backend requires a PostgreSQL database instance:
* **Version:** PostgreSQL 18.x (or 15.x/16.x/17.x compatible)
* **Port:** 5432
* **Service Name:** postgresql-x64-18 (on Windows)

### 2. Environment Variables Setup
Create a `.env` file in the `backend/` folder by copying `backend/.env.example` and filling in your credentials:
```bash
# Inside backend/.env
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/ridenow?schema=public"
PORT=3000
```

### 3. Database Migration & Setup Commands
Run the following commands inside the `backend/` directory to prepare your database:

* **Initialize database and apply migrations:**
```bash
npm run db:migrate
```
This creates the database tables according to the schema.

* **Seed the database with mock/dev data:**
```bash
npx prisma db seed
```
This runs `prisma/seed.ts`, adding one Admin, one Customer, one Driver, one Vehicle, and basic Pricing configurations.

* **Generate Prisma Client manually (if needed):**
```bash
npx prisma generate
```

* **Open Prisma Studio (Interactive database browser UI):**
```bash
npm run db:studio
```
