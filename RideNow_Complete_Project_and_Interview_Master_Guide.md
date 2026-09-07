# RideNow — Complete Technical Architecture & Interview Preparation Master Guide

> **A Complete End-to-End Walkthrough of the Ride-Hailing Platform (Backend, Database, Driver App, Customer Web, Admin Portal) with 30+ In-Depth Interview Questions & Answers**

---

## 📖 Chapter 1: The Big Picture (Explained Simply)

Imagine you want to travel from your college to a coffee shop. You open your phone, tap **"Book Auto"**, and in 30 seconds, a nearby driver accepts your trip, drives to your location, picks you up, drops you off, and you pay ₹60 in Cash or UPI.

**RideNow** is the complete full-stack software brain that makes this entire experience happen seamlessly in real-time. Just like Rapido, Uber, or Ola, RideNow connects three distinct groups of users:

1. **Passenger (Customer):** Selects pickup & dropoff on an interactive map, views fares in Indian Rupees (₹ INR), chooses Cash/Online, and tracks the captain live.
2. **Captain (Driver):** Toggles Duty (ONLINE/OFFLINE), sends live GPS breadcrumbs, receives instant animated ride requests, accepts/declines trips, and tracks daily earnings.
3. **Operations Admin:** Approves driver licenses, configures per-km pricing rates, monitors live rides, resolves disputes, and audits staff actions.

---

## 🏗️ Chapter 2: System Architecture & The 4 Applications

The RideNow codebase is organized into four decoupled projects:

| Application Directory | Tech Stack | Core Responsibility |
|---|---|---|
| `backend` (Port 3000) | Node.js, Express, TypeScript, Prisma ORM, PostgreSQL, Socket.IO, Stripe, Firebase | Central REST API, automated dispatch engine, payment holds/captures, JWT auth, and WebSocket event hub. |
| `customer-web` (Port 5173) | React 18, Vite, TypeScript, MapLibre GL, OSRM Routing | Passenger web app with address auto-complete, route drawing, ₹ INR fare simulator, and live driver tracking. |
| `driver-mobile` (Port 8081) | React Native, Geolocation, Socket.IO Client | Captain mobile app with duty toggle, GPS tracker, incoming request modal (Accept/Decline), and trip milestones. |
| `admin-web` (Port 5174) | React 18, Vite, TypeScript, Dark/Light Themes | 11-module fleet control center for captain KYC verification, manual/auto-dispatch, live fare rates, and RBAC staff management. |

---

## 🗄️ Chapter 3: Database Schema Blueprint

RideNow uses PostgreSQL with Prisma ORM (`backend/prisma/schema.prisma`):

- **`User` & `AdminStaff`:** Identity credentials (email, bcrypt password hash, role: CUSTOMER, DRIVER, ADMIN) and FCM push notification tokens.
- **`Customer`:** Passenger profile with phone number, saved Stripe customer ID, trusted emergency contacts, and payment preferences.
- **`Driver`, `Vehicle` & `DriverLocation`:** Captain verification details (license number, `isApproved`, `status: OFFLINE | ONLINE | BUSY`), registered vehicle (make, model, license plate, strict type: `BIKE | AUTO | CAB`), and live GPS coordinates.
- **`Ride` & `RideStatusHistory`:** Central trip record (pickup/dropoff coordinates, authoritative ₹ INR fare, vehicle type, distance, duration, assigned driver ID, and status) with an immutable audit timeline.
- **`RideDeclinedDriver`:** Tracks drivers who declined a specific ride, isolating them so they are not re-prompted while the engine rolls over to the next captain.
- **`Payment`:** Financial ledger (amount in ₹ INR, method: CASH | UPI | CARD, status: PENDING | AUTHORIZED | COMPLETED | FAILED | REFUNDED, provider, gateway transaction ID).
- **`Pricing`:** Dynamic fare rates per vehicle class (base fare, per-km rate, per-minute rate, minimum fare).

```
Ride Lifecycle:
REQUESTED -> SEARCHING_DRIVER -> DRIVER_ASSIGNED -> DRIVER_ARRIVING -> DRIVER_ARRIVED -> RIDE_STARTED -> RIDE_COMPLETED (or CANCELLED / NO_DRIVER_AVAILABLE)
```

---

## ⚡ Chapter 4: Core Workflows & Algorithms

### 1. Authoritative Fare Estimation
- **Haversine Formula:** Computes great-circle straight line distance between coordinates in kilometers.
- **OSRM Road Routing:** Fetches actual road network distance and driving duration in minutes.
- **Formula:** `Total Fare = Base Fare + (Distance in km * Per Km Rate) + (Duration in mins * Per Minute Rate)`.
- **Security:** Frontend never submits price; backend calculates authoritatively from `Pricing` table.

### 2. Automatic Dispatch Engine (`DispatchService`)
- **Strict 5-Point Eligibility:** Captain must be (1) `isApproved === true`, (2) `isSuspended === false`, (3) `status === ONLINE`, (4) `vehicle.type === ride.vehicleType` (Strict matching: Bike -> Bike, Auto -> Auto, Cab -> Cab), and (5) No active ongoing trip.
- **Proximity Sorting:** Sorts eligible non-declined drivers by distance to pickup point.
- **Targeted Alert:** Sends instant `incoming_ride_request` WebSocket event and FCM push notification.
- **Automatic Roll-Over:** If declined, saves to `RideDeclinedDriver` and cascades immediately to the next captain.

### 3. Atomic Concurrency Locking
- **Database Lock:** `tx.ride.updateMany({ where: { id: rideId, status: 'SEARCHING_DRIVER' }, data: { status: 'DRIVER_ASSIGNED', driverId } })`.
- **Zero Race Conditions:** PostgreSQL serializes writes. Winner gets HTTP 200; concurrent loser gets HTTP 409 Conflict.

---

## 🎯 Chapter 5: Master Interview Questions & Answers

### Q1: Can you give an elevator pitch / high-level summary of RideNow?
**Answer:** RideNow is a production-grade, real-time on-demand ride-hailing and fleet management platform modeled after Rapido and Uber. It features a TypeScript/Node.js backend with PostgreSQL and Prisma ORM, Socket.IO WebSockets, a React 18 customer web app, a React Native driver mobile app, and an 11-module admin operations portal. Key engineering accomplishments include an autonomous proximity-based driver dispatch engine with strict vehicle matching, atomic concurrency locking to eliminate race conditions, and segregated payment pre-authorization holds vs cash-at-completion lifecycles.

### Q2: Why did you choose PostgreSQL + Prisma over MongoDB?
**Answer:**
- **ACID Transactions:** Multi-table operations (driver accept, status update, driver busy switch) must execute atomically without partial state corruptions.
- **Relational Integrity:** Foreign keys ensure that deleting a user or driver cascades cleanly without orphaned location or vehicle records.
- **Multi-Condition Filtering:** Complex queries (online, approved, matching vehicle, within 10km, not declined) perform optimally with relational composite indexes.

### Q3: How does real-time communication work in RideNow?
**Answer:** We use Socket.IO with a dual-layer room architecture: role-based rooms (`role:DRIVER` for broadcasts) and entity-level rooms (`ride:{rideId}` and `user:{userId}` for targeted alerts). If mobile connectivity is unstable, clients use short-polling (every 3-5 seconds) as an automated resilient fallback.

### Q4: How would you scale RideNow to 1 Million active rides per day?
**Answer:**
1. Horizontal API scaling behind an Application Load Balancer.
2. Redis Pub/Sub socket adapter (`@socket.io/redis-adapter`) for cross-server socket broadcasts.
3. Redis Geohashing (`GEOADD`, `GEORADIUS`) or PostgreSQL PostGIS for sub-millisecond proximity queries.
4. Distributed message queues (BullMQ / RabbitMQ) for background dispatch workers.

### Q5: How do you prevent two drivers from accepting the same ride simultaneously?
**Answer:** We execute an atomic conditional update inside `prisma.$transaction`: `updateMany({ where: { id, status: 'SEARCHING_DRIVER' }, data: { status: 'DRIVER_ASSIGNED', driverId } })`. PostgreSQL row-level locks serialize the write. Driver A updates 1 row and succeeds (HTTP 200). Driver B matches 0 rows, throws `CONCURRENT_MODIFICATION_DETECTED`, and receives HTTP 409 Conflict.

### Q6: How do you guarantee a driver is never assigned to two rides at once?
**Answer:**
- `DispatchService` filters out any driver whose `rides` contain an active ongoing trip.
- When accepting a ride, the driver's duty state is set to `BUSY` in the same database transaction.
- If a driver attempts to accept another ride while in `BUSY` status, the backend rejects it with HTTP 400 `DRIVER_BUSY`.

### Q7: Why did you separate Payment Status from Ride Status?
**Answer:** Ride Status (`SEARCHING_DRIVER`, `DRIVER_ASSIGNED`, `RIDE_STARTED`, `RIDE_COMPLETED`) tracks the physical vehicle journey, while Payment Status (`PENDING`, `AUTHORIZED`, `COMPLETED`, `REFUNDED`) tracks the financial settlement. For Cash rides, `Payment.paymentMethod = CASH` and `Payment.status = PENDING` (labeled *"Cash: Pay at trip completion"*), which avoids confusing customers with payment errors.

### Q8: How does the Stripe Pre-authorization hold work?
**Answer:** When booking with a Card, we create a Stripe PaymentIntent with `capture_method: 'manual'`. This reserves the funds without capturing them immediately. Only when authorized does the ride transition to `SEARCHING_DRIVER` and trigger driver matching. Upon `RIDE_COMPLETED`, the funds are captured automatically with an idempotency key.

### Q9: What was the CORS Preflight issue and how did you resolve it?
**Answer:** Browsers send an `OPTIONS` preflight before `PATCH`/`POST` requests with custom headers. The auth middleware was returning 401 Unauthorized because browsers do not attach Bearer tokens to preflight requests. We added `if (req.method === 'OPTIONS') return next();` in `auth.middleware.ts` and set up universal preflight handlers returning 200/204 with explicit CORS headers.
