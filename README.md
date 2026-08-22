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
