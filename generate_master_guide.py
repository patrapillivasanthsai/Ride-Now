import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def create_document():
    doc = docx.Document()

    # Page Setup
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(0.75)
        section.bottom_margin = Inches(0.75)
        section.left_margin = Inches(0.75)
        section.right_margin = Inches(0.75)

    # Styles
    styles = doc.styles
    normal_style = styles['Normal']
    normal_style.font.name = 'Calibri'
    normal_style.font.size = Pt(11)
    normal_style.font.color.rgb = RGBColor(30, 41, 59)

    # Title
    title = doc.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_title = title.add_run("RideNow — Complete Technical Architecture & Interview Preparation Master Guide\n")
    run_title.bold = True
    run_title.font.size = Pt(22)
    run_title.font.color.rgb = RGBColor(15, 23, 42)

    sub = doc.add_paragraph()
    sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_sub = sub.add_run("A Complete End-to-End Walkthrough of the Ride-Hailing Platform (Backend, Database, Driver App, Customer Web, Admin Portal) with 30+ In-Depth Interview Questions & Answers\n")
    run_sub.font.size = Pt(12)
    run_sub.font.color.rgb = RGBColor(71, 85, 105)

    doc.add_paragraph("―" * 60).alignment = WD_ALIGN_PARAGRAPH.CENTER

    def add_heading_1(text):
        h = doc.add_paragraph()
        h.paragraph_format.space_before = Pt(18)
        h.paragraph_format.space_after = Pt(6)
        r = h.add_run(text)
        r.bold = True
        r.font.size = Pt(16)
        r.font.color.rgb = RGBColor(2, 132, 199) # Primary Blue
        return h

    def add_heading_2(text):
        h = doc.add_paragraph()
        h.paragraph_format.space_before = Pt(12)
        h.paragraph_format.space_after = Pt(4)
        r = h.add_run(text)
        r.bold = True
        r.font.size = Pt(13)
        r.font.color.rgb = RGBColor(15, 23, 42)
        return h

    def add_heading_3(text):
        h = doc.add_paragraph()
        h.paragraph_format.space_before = Pt(8)
        h.paragraph_format.space_after = Pt(2)
        r = h.add_run(text)
        r.bold = True
        r.font.size = Pt(11.5)
        r.font.color.rgb = RGBColor(5, 150, 105) # Green
        return h

    def add_callout(text, title_text="KEY CONCEPT"):
        tbl = doc.add_table(rows=1, cols=1)
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        cell = tbl.cell(0, 0)
        set_cell_background(cell, "F0F9FF")
        p = cell.paragraphs[0]
        p.paragraph_format.space_before = Pt(4)
        p.paragraph_format.space_after = Pt(4)
        r1 = p.add_run(f"💡 {title_text}: ")
        r1.bold = True
        r1.font.color.rgb = RGBColor(2, 132, 199)
        r2 = p.add_run(text)
        r2.font.color.rgb = RGBColor(30, 41, 59)
        doc.add_paragraph().paragraph_format.space_after = Pt(4)

    def add_qa(q_num, question, answer_bullets):
        h = doc.add_paragraph()
        h.paragraph_format.space_before = Pt(10)
        h.paragraph_format.space_after = Pt(3)
        r_q = h.add_run(f"Q{q_num}: {question}")
        r_q.bold = True
        r_q.font.size = Pt(12)
        r_q.font.color.rgb = RGBColor(15, 23, 42)

        for b in answer_bullets:
            p = doc.add_paragraph(style='List Bullet')
            p.paragraph_format.space_before = Pt(1)
            p.paragraph_format.space_after = Pt(2)
            # Parse bold prefix if exists
            if ":" in b and len(b.split(":")[0]) < 35:
                prefix, rest = b.split(":", 1)
                r_pre = p.add_run(prefix + ":")
                r_pre.bold = True
                p.add_run(rest)
            else:
                p.add_run(b)

    # ==========================================
    # CHAPTER 1: THE BIG PICTURE
    # ==========================================
    add_heading_1("Chapter 1: The Big Picture (Explained for Anyone)")
    
    p = doc.add_paragraph()
    p.add_run("Imagine you want to go from your school to a playground. You open your phone, tap 'Book Bike', and in 30 seconds, a nearby captain on a motorcycle accepts your ride, arrives at your gate, gives you a helmet, drops you off, and you pay ₹40 in cash or via UPI.\n\n"
              "RideNow is the complete software brain that powers this entire experience. Just like Rapido, Uber, or Ola, RideNow connects three different groups of people seamlessly in real-time.")

    add_callout(
        "RideNow is a complete, production-grade On-Demand Ride Hailing & Fleet Management Ecosystem built with modern TypeScript, PostgreSQL, Prisma ORM, WebSockets, React, and React Native.",
        "EXECUTIVE OVERVIEW"
    )

    add_heading_2("The Three Key Users of RideNow")
    
    doc.add_paragraph("1. The Passenger (Customer): Books rides (Bike, Auto, or Cab), tracks the captain's live location on a real-time map, views authoritative fares in Indian Rupees (₹ INR), chooses Cash or Online payment, and rates the driver after the trip.", style='List Bullet')
    doc.add_paragraph("2. The Captain (Driver): Toggles duty status (ONLINE / OFFLINE), broadcasts GPS coordinates, receives instant animated ride request pop-ups, accepts/declines trips, navigates pickup/dropoff stages, and tracks earnings.", style='List Bullet')
    doc.add_paragraph("3. The Operations Team (Admin): A unified mission-control portal with 11 modules to verify captain driving licenses, manage dynamic pricing (base fare, per-km, per-minute rates), monitor live trips, review customer disputes, manage RBAC staff roles, and audit system logs.", style='List Bullet')

    add_heading_2("The Four Main Software Applications in the Repository")
    
    table_apps = doc.add_table(rows=5, cols=3)
    table_apps.style = 'Table Grid'
    headers = ["Application", "Tech Stack", "Primary Functionality"]
    for i, h in enumerate(headers):
        cell = table_apps.cell(0, i)
        set_cell_background(cell, "0F172A")
        r = cell.paragraphs[0].add_run(h)
        r.bold = True
        r.font.color.rgb = RGBColor(255, 255, 255)

    apps_data = [
        ("Backend API Server", "Node.js, Express, TypeScript, Prisma ORM, PostgreSQL, Socket.IO, Stripe, Firebase", "Authoritative business logic, automated dispatch engine, payment processing, authentication, and WebSockets."),
        ("Customer Web Portal", "React 18, Vite, TypeScript, MapLibre GL, OSRM Routing", "Passenger UI for address auto-suggest, live fare estimation, real-time captain tracking, and reviews."),
        ("Driver Mobile App", "React Native, Geolocation, Socket.IO Client, TypeScript", "Captain app with duty switch, GPS breadcrumb tracking, incoming ride request modal, and trip navigation."),
        ("Admin Web Portal", "React 18, Vite, TypeScript, Theme Context (Dark/Light)", "11-module fleet control center for dispatch monitoring, captain approvals, fare simulator, and staff RBAC.")
    ]

    for row_idx, data in enumerate(apps_data, start=1):
        for col_idx, text in enumerate(data):
            cell = table_apps.cell(row_idx, col_idx)
            set_cell_background(cell, "F8FAFC" if row_idx % 2 == 1 else "FFFFFF")
            cell.paragraphs[0].add_run(text)

    doc.add_paragraph().paragraph_format.space_after = Pt(6)

    # ==========================================
    # CHAPTER 2: ARCHITECTURE & TECH STACK
    # ==========================================
    add_heading_1("Chapter 2: Full-Stack Architecture & Technology Decisions")

    doc.add_paragraph("RideNow adopts a modular, event-driven client-server architecture. The server acts as the single source of truth for pricing, permissions, and trip state.")

    add_heading_2("Why These Technologies Were Chosen")
    
    doc.add_paragraph("• TypeScript Everywhere: End-to-end type safety across backend and all web/mobile frontends eliminates common runtime null errors and ensures API contract consistency.", style='List Bullet')
    doc.add_paragraph("• PostgreSQL + Prisma ORM: Ride hailing requires ACID transactions (atomic updates) to prevent race conditions (e.g. two drivers accepting the same ride). Relational data with foreign keys and strict constraints prevents corrupted trip states.", style='List Bullet')
    doc.add_paragraph("• Socket.IO (WebSockets) + HTTP Polling Fallback: Provides sub-second bi-directional event delivery for incoming ride alerts and location breadcrumbs, backed up by intelligent polling for network resilience.", style='List Bullet')
    doc.add_paragraph("• MapLibre GL & OpenStreetMap (OSRM): High-performance vector map rendering and road geometry calculations without expensive proprietary API billing.", style='List Bullet')
    doc.add_paragraph("• Stripe SDK + Mock Service Architecture: Allows seamless switching between live payment gateway authorization and zero-configuration local development mock mode.", style='List Bullet')

    # ==========================================
    # CHAPTER 3: DATABASE SCHEMA BLUEPRINT
    # ==========================================
    add_heading_1("Chapter 3: Database Schema & Entity Blueprint")

    doc.add_paragraph("The database schema is defined in Prisma (`backend/prisma/schema.prisma`) and runs on PostgreSQL. Here is the blueprint of every key model:")

    models_info = [
        ("User", "Core authentication entity. Stores email, hashed password (bcrypt), user role (CUSTOMER, DRIVER, ADMIN), and Firebase FCM push notification token."),
        ("Customer", "Passenger profile. Contains phone number, saved Stripe customer ID, trusted emergency contacts, and default payment preference."),
        ("Driver", "Captain profile. Holds driving license number, approval flag (isApproved), suspension status, duty status (OFFLINE, ONLINE, BUSY), and relations to Vehicle and Location."),
        ("Vehicle", "Captain's registered vehicle. Stores make, model, year, color, license plate number, and strict VehicleType (BIKE, AUTO, CAB)."),
        ("DriverLocation", "Live GPS tracking table. Stores latest latitude, longitude, and update timestamp for proximity calculations."),
        ("Ride", "Central trip entity. Tracks pickup/dropoff coordinates and addresses, authoritative fare (in ₹ INR), vehicle type, distance, duration, assigned driverId, and RideStatus."),
        ("RideStatusHistory", "Immutable audit trail. Logs every state transition timestamp and reason for full dispute resolution."),
        ("RideDeclinedDriver", "Tracks when a driver declines a ride request, ensuring they are not repeatedly prompted and enabling automatic roll-over to the next candidate."),
        ("Payment", "Financial ledger record. Stores amount, payment method (CASH, UPI, CARD), payment status (PENDING, AUTHORIZED, COMPLETED, FAILED, REFUNDED), provider, and gateway transaction ID."),
        ("Pricing", "Dynamic fare rate configuration for each vehicle class (baseFare, perKmRate, perMinuteRate, minimumFare)."),
        ("Rating & AuditLog", "Two-way review system (score 1-5, comments) and admin staff audit logging.")
    ]

    for name, desc in models_info:
        add_heading_3(f"Model: {name}")
        doc.add_paragraph(desc)

    add_heading_2("The Complete Ride Lifecycle State Machine")
    
    doc.add_paragraph("1. REQUESTED: Customer creates ride request. If online payment, waits for pre-auth hold.")
    doc.add_paragraph("2. SEARCHING_DRIVER: Payment authorized or Cash selected. Automatic dispatch searches for matching captains.")
    doc.add_paragraph("3. DRIVER_ASSIGNED: Captain accepts the request. Driver becomes BUSY; customer sees captain details.")
    doc.add_paragraph("4. DRIVER_ARRIVING: Captain is driving towards the pickup point.")
    doc.add_paragraph("5. DRIVER_ARRIVED: Captain has reached passenger's pickup location.")
    doc.add_paragraph("6. RIDE_STARTED: Passenger is aboard and the trip to destination is in progress.")
    doc.add_paragraph("7. RIDE_COMPLETED: Dropoff reached. Payment captured (if online) or Cash collected. Driver becomes ONLINE.")
    doc.add_paragraph("8. CANCELLED / NO_DRIVER_AVAILABLE: Terminal failure states handled gracefully with payment releases.")

    # ==========================================
    # CHAPTER 4: CORE WORKFLOWS & ALGORITHMS
    # ==========================================
    add_heading_1("Chapter 4: Core Workflows, Algorithms & Implementation")

    add_heading_2("1. Fare Calculation & Estimation Engine")
    doc.add_paragraph("When a passenger selects pickup and dropoff locations, the backend calculates the authoritative fare:")
    doc.add_paragraph("• Haversine Distance Formula: Calculates great-circle straight line distance between two coordinates in kilometers using Earth radius (R = 6371 km).")
    doc.add_paragraph("• OSRM Road Routing: Fetches actual road network distance and driving duration from Open Source Routing Machine.")
    doc.add_paragraph("• Authoritative Formula: Total Fare = Base Fare + (Distance in km × Per Km Rate) + (Duration in mins × Per Minute Rate).")
    doc.add_paragraph("• Security Rule: The frontend NEVER calculates or submits the fare amount. The backend queries the `Pricing` table directly to prevent price tampering.")

    add_heading_2("2. The Automatic Dispatch & Driver Matching Engine (`DispatchService`)")
    doc.add_paragraph("Unlike basic systems where an admin must manually click 'Assign', RideNow features a fully autonomous dispatch engine:")
    doc.add_paragraph("1. Eligibility Filter: A driver is eligible ONLY if (a) `isApproved === true`, (b) `isSuspended === false`, (c) `status === ONLINE`, (d) `vehicle.type === ride.vehicleType` (Strict matching!), (e) Driver has no active ongoing trip, and (f) Driver has not already declined this ride.")
    doc.add_paragraph("2. Proximity Sorting: Eligible drivers are sorted by Haversine distance from their live GPS location to the passenger's pickup location (nearest captain first).")
    doc.add_paragraph("3. Instant Targeted Alert: Emits a targeted Socket.IO event (`incoming_ride_request`) directly to the matching driver's private channel and sends an FCM mobile push notification.")
    doc.add_paragraph("4. Automatic Roll-over: If the driver taps 'Decline', the engine records the decline in `RideDeclinedDriver` and immediately searches for and notifies the next nearest available captain.")

    add_heading_2("3. Concurrency Lock & Atomic Driver Acceptance")
    doc.add_paragraph("What happens if two drivers tap 'Accept' at the exact same millisecond?")
    doc.add_paragraph("• Atomic Database Transaction: Inside `prisma.$transaction`, the backend executes an `updateMany` with a conditional WHERE clause: `where: { id: rideId, status: SEARCHING_DRIVER }`.")
    doc.add_paragraph("• Zero Race Conditions: The database engine serializes the write. The first driver updates 1 record and succeeds (HTTP 200). The second driver matches 0 records because the status is no longer SEARCHING_DRIVER, receives an immediate HTTP 409 Conflict error, and their app gracefully refreshes.")
    doc.add_paragraph("• Driver Status Update: The winning driver is atomically marked `status: BUSY` so they cannot receive another active ride.")

    add_heading_2("4. Cash vs Online Payment Architecture")
    doc.add_paragraph("• Cash Ride Flow: Customer selects Cash -> Ride is created immediately in `SEARCHING_DRIVER` -> Fare is clearly shown in ₹ INR -> Payment status is `PENDING` (labeled 'Pay Cash at Completion') -> Driver search begins instantly -> Passenger pays driver upon reaching destination.")
    doc.add_paragraph("• Online Payment Flow (Stripe/UPI): Customer selects Card -> Backend places a pre-authorization hold on the customer's card (`capture_method: manual`) -> NO driver is dispatched until the hold succeeds -> Once confirmed, ride transitions to `SEARCHING_DRIVER` and dispatch begins -> Upon `RIDE_COMPLETED`, the payment is captured automatically.")

    add_heading_2("5. CORS Preflight & Browser Security Resolution")
    doc.add_paragraph("During browser interaction (e.g. from Admin Web on port 5174 or Customer Web on port 5173 to Backend on port 3000):")
    doc.add_paragraph("• Problem: Browsers send an `OPTIONS` preflight request before `PATCH`/`POST` requests with custom headers. Authentication middlewares were failing the preflight with 401 because browsers do not send Bearer tokens on `OPTIONS` requests.")
    doc.add_paragraph("• Solution: Added `if (req.method === 'OPTIONS') return next();` to `authenticate` and `requireRole` middlewares, and implemented universal preflight interceptor returning 200/204 with `Access-Control-Allow-Origin`, `Methods`, and `Headers`.")

    # ==========================================
    # CHAPTER 5: INTERVIEW PREPARATION (MEGA Q&A)
    # ==========================================
    add_heading_1("Chapter 5: Master Interview Questions & Answers (30+ Scenarios)")

    add_heading_2("Section A: High-Level Architecture & System Design")

    add_qa(1, "Can you give an elevator pitch / high-level overview of the RideNow project?", [
        "Project Summary: RideNow is a full-stack, real-time on-demand ride-hailing and fleet operations platform built to emulate systems like Rapido and Uber.",
        "Architecture: It consists of a Node.js/TypeScript backend running on Express, PostgreSQL with Prisma ORM, Socket.IO for real-time events, a React 18 customer web portal, a React Native driver mobile app, and an 11-module React admin operations portal.",
        "Key Engineering Highlights: Autonomous proximity-based driver dispatch with strict vehicle matching, atomic concurrency locking to prevent double-booking, separated payment pre-authorization holds vs cash-at-completion flows, and an immutable status audit trail."
    ])

    add_qa(2, "Why did you choose PostgreSQL over MongoDB for a ride-hailing backend?", [
        "ACID Transactions: Ride booking, driver assignment, and payment state transitions require strict atomicity and consistency. In a ride-hailing app, two drivers accepting the same ride or a payment failing while a ride is marked paid must roll back completely.",
        "Relational Integrity: Entities like Users, Customers, Drivers, Vehicles, Rides, and Payments have strict foreign key constraints. If a driver profile is deleted, orphaned vehicle or location records are prevented.",
        "Complex Filtering & Indexing: We perform multi-table queries (e.g., finding online, approved drivers with a specific vehicle type within 10km who haven't declined the ride). PostgreSQL indexes on `status`, `driverId`, and composite keys on `[rideId, driverId]` provide optimal query performance."
    ])

    add_qa(3, "How does real-time communication work in RideNow?", [
        "Bi-directional WebSockets: We use Socket.IO to manage persistent connections.",
        "Room Hierarchy: We partition sockets into two levels: Role-based rooms (e.g., `role:DRIVER` for broadcasting general available trips) and Entity rooms (e.g., `ride:{rideId}` and `user:{userId}`).",
        "Targeted Dispatch: When a ride is booked, `DispatchService` sends targeted `incoming_ride_request` events directly to the private user socket of the closest matching captains.",
        "Hybrid Polling Fallback: If a mobile driver experiences intermittent 4G/5G mobile packet loss, the client uses intelligent short-polling (every 3–5 seconds) to guarantee synchronization without blocking the UI."
    ])

    add_qa(4, "How would you scale RideNow to handle 1,000,000 active rides per day?", [
        "Stateless Backend Scaling: Deploy multiple instances of the Node.js API server behind an Application Load Balancer (ALB) / Nginx.",
        "Redis Pub/Sub Socket Adapter: Use `@socket.io/redis-adapter` so that socket events emitted on Server A reach clients connected to Server B.",
        "Geospatial Indexing with PostGIS / Redis Geohash: Replace in-memory Haversine calculations with Redis GEO commands (`GEOADD`, `GEORADIUS`) or PostgreSQL PostGIS indexes for sub-millisecond proximity queries across 100,000+ online drivers.",
        "Message Queues for Dispatch: Offload driver matching to a distributed queue like RabbitMQ or Kafka with worker pools to decouple HTTP request lifecycles from background dispatch iterations."
    ])

    add_heading_2("Section B: Concurrency, Race Conditions & Database Safety")

    add_qa(5, "How do you prevent two drivers from accepting the same ride simultaneously?", [
        "The Danger: If Driver A and Driver B click 'Accept' within 10 milliseconds of each other, naive code might read status='SEARCHING_DRIVER' for both and assign both.",
        "The Solution: We use an atomic conditional database update inside `prisma.$transaction`. We run `tx.ride.updateMany({ where: { id, status: 'SEARCHING_DRIVER' }, data: { status: 'DRIVER_ASSIGNED', driverId } })`.",
        "Result: PostgreSQL uses row-level locking during the UPDATE. Driver A's transaction succeeds and updates 1 row (count = 1). When Driver B's transaction executes, the row status is already 'DRIVER_ASSIGNED', so count = 0. The backend throws `CONCURRENT_MODIFICATION_DETECTED` and returns HTTP 409 Conflict to Driver B."
    ])

    add_qa(6, "How do you ensure a driver is never assigned to two rides at the same time?", [
        "Double-Validation: (1) In `DispatchService.findEligibleDrivers`, we add a WHERE condition `rides: { none: { status: { in: ['DRIVER_ASSIGNED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'RIDE_STARTED'] } } }` so busy drivers are never queried.",
        "Atomic State Switch: When a driver accepts a ride, their duty state is updated to `DriverStatus.BUSY` in the same atomic database transaction.",
        "Acceptance Guard: If a driver attempts to accept an API request while in `BUSY` status, the backend rejects it immediately with HTTP 400 `DRIVER_BUSY`."
    ])

    add_qa(7, "What happens if a driver declines a ride? How does roll-over work?", [
        "Decline Isolation: The driver calls `POST /api/driver/rides/:id/decline`. The backend records a row in the `RideDeclinedDriver` table (`{ rideId, driverId, reason }`).",
        "Local Dismissal: The ride is removed from that driver's UI immediately.",
        "Automatic Cascade: The backend triggers `DispatchService.dispatchRide(rideId)`. The query excludes all driver IDs present in `RideDeclinedDriver` and dispatches the request to the next nearest eligible captain.",
        "Timeout / Fallback: If all eligible captains decline or none are online, the ride status transitions to `NO_DRIVER_AVAILABLE` and informs the customer."
    ])

    add_heading_2("Section C: Payment Engineering & Cash Handling")

    add_qa(8, "How did you separate Payment Status from Ride Status? Why is this critical?", [
        "The Problem: In naive implementations, a single `status` field is used. For Cash rides, marking payment 'PENDING' would make the customer think the ride was stuck in payment verification.",
        "The Solution: We separated the domains completely: `Ride.status` (`SEARCHING_DRIVER`, `DRIVER_ASSIGNED`, `RIDE_STARTED`, `RIDE_COMPLETED`) tracks the physical trip, while `Payment.status` (`PENDING`, `AUTHORIZED`, `COMPLETED`, `FAILED`, `REFUNDED`) tracks the money.",
        "Cash Representation: For Cash, `Payment.paymentMethod = CASH` and `Payment.status = PENDING`. The UI displays '₹250.00 · Cash: Pay directly to captain upon trip completion', eliminating passenger confusion."
    ])

    add_qa(9, "How does the Stripe Online Payment Pre-authorization hold work?", [
        "Two-Step Capture (Escrow-style): When booking with a Card, we create a Stripe `PaymentIntent` with `capture_method: 'manual'`.",
        "Hold vs Charge: This places an authorization hold on the passenger's bank account without transferring funds immediately.",
        "Dispatch Trigger: Only when the hold status reaches `requires_capture` (authorized) does the ride transition to `SEARCHING_DRIVER` and trigger driver matching.",
        "Settlement: When the captain marks the trip `RIDE_COMPLETED`, the backend executes `stripe.paymentIntents.capture()` with an idempotency key (`capture-{rideId}`). If the customer cancels before assignment, `stripe.paymentIntents.cancel()` voids the hold with zero transaction fees."
    ])

    add_qa(10, "What is an Idempotency Key and why did you use it in payments?", [
        "Definition: An idempotency key is a unique token (e.g. `capture-${rideId}`) sent in an API request header that ensures an operation is executed at most once, even if repeated multiple times due to network timeouts.",
        "Use Case: If the backend captures a Stripe payment and the network drops before receiving the HTTP 200 response from Stripe, a retry with the same idempotency key guarantees the passenger is never double-charged."
    ])

    add_heading_2("Section D: Security, CORS & Authentication")

    add_qa(11, "What was the CORS Preflight issue you encountered and how did you resolve it?", [
        "Root Cause: When the Admin Portal (`http://localhost:5174`) sent a `PATCH` request with custom headers to `http://localhost:3000`, the browser first sent an HTTP `OPTIONS` preflight request. The Express `authenticate` middleware intercepted this `OPTIONS` request and returned 401 Unauthorized because browsers do not attach Bearer tokens to preflight requests.",
        "Fix: In `auth.middleware.ts`, we added an early return `if (req.method === 'OPTIONS') return next();`. We also configured universal CORS preflight handlers returning 200/204 with explicit `Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS` and `Access-Control-Allow-Origin`."
    ])

    add_qa(12, "How is Authentication and RBAC (Role-Based Access Control) enforced?", [
        "Password Security: Driver and Customer passwords are salted and hashed using `bcrypt` (10 salt rounds). Plaintext passwords are never stored or logged.",
        "Stateless Tokens: Upon login, the backend issues a signed JSON Web Token (JWT) containing `userId` and `role` with an expiration window.",
        "Middleware Pipeline: `authenticate` validates the cryptographic signature of the token and loads the user context into `req.user`. `requireRole(UserRole.ADMIN)` blocks non-admin users with HTTP 403 Forbidden."
    ])

    add_heading_2("Section E: Frontend & Mobile Engineering")

    add_qa(13, "How did you design the Driver Mobile incoming request experience?", [
        "Urgency & Contrast: When a ride is dispatched, an animated high-contrast request card pops up showing vehicle class badge, pickup address with green pin, destination with red pin, distance away in km, and fare in large green ₹ INR bold text.",
        "Clear Decisions: Two large action targets: 'Accept Ride' (triggers atomic transaction, switches driver to BUSY, opens active trip navigation) and 'Decline' (rolls over to next driver).",
        "Background Duty Management: A switch toggle updates duty status to ONLINE/OFFLINE and enables continuous GPS watchPosition tracking."
    ])

    add_qa(14, "How does the Customer Portal handle ride tracking without excessive server load?", [
        "Dynamic Polling & WebSockets: The Customer Portal listens for Socket.IO `ride_status_changed` events. As a resilient backup, when the trip is in an active state (`SEARCHING_DRIVER`, `DRIVER_ASSIGNED`, etc.), it polls the detail endpoint every 2.5 seconds.",
        "Clean Unmount: As soon as the ride reaches a terminal status (`RIDE_COMPLETED` or `CANCELLED`), polling timers are cleared (`clearInterval`) to prevent memory leaks and unnecessary network calls."
    ])

    add_heading_2("Section F: Behavioral & Problem Solving")

    add_qa(15, "Tell me about a challenging bug you encountered in this project and how you solved it.", [
        "The Challenge: Drivers in the mobile app were occasionally receiving 'Incompatible Vehicle' errors or 'Failed to poll rides' when newly registered.",
        "Investigation: We traced the issue to unapproved driver profiles trying to fetch available rides, and instances where driver vehicle types weren't strictly validated before query execution.",
        "Solution: We refactored `DispatchService.findEligibleDrivers` and `getAvailableRides` to enforce a strict 5-point verification pipeline (`isApproved`, `!isSuspended`, `status === ONLINE`, exact vehicle type matching, and zero active trips). We also added comprehensive automated Jest tests to verify vehicle isolation (e.g. Bike drivers never receive Cab requests), ensuring 100% test pass rate."
    ])

    # Save Word Document
    output_docx = r"v:\experiment\rapido\ridenow\RideNow_Complete_Project_and_Interview_Master_Guide.docx"
    doc.save(output_docx)
    print(f"Successfully generated Word document at: {output_docx}")

if __name__ == "__main__":
    create_document()
