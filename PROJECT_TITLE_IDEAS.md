# Final Year Project — Title Ideas

A shortlist of booking-style project titles for final year groups. Every idea here is a **variation on BookMyRoom**, so you can open the `bookmyroom_app/` reference build whenever you get stuck — the data models, authentication, file uploads and payment flow all translate across.

**Format**: 15 groups, 2 members each. One title per group, **no two groups take the same domain**.

**Stack for all projects**:

| Layer | Technology |
|-------|-----------|
| Frontend | **Next.js** (App Router) + TypeScript + Tailwind CSS + shadcn/ui |
| Backend | **Node.js + Express** + TypeScript |
| Database | MongoDB + Mongoose |
| Auth | JWT + bcrypt, role-based |
| Uploads | Multer |
| Payment | eSewa / Khalti sandbox + Cash on Delivery |

> See `project-lessons/01-nextjs-and-shadcn-setup.md` to set up the frontend. This time we use **Next.js, not Vite**.

---

## 1. What Every Project Must Have

Whatever title you pick, the examiner expects this spine. It is the same spine as BookMyRoom:

```
Authentication
├── Register / Login (JWT)
├── Two roles: Provider and Customer
└── Protected routes based on role

Provider side
├── Create a listing (with image upload)
├── Edit / delete their own listings
├── See incoming booking requests
└── Confirm or reject a booking

Customer side
├── Browse and search listings
├── Filter (price, location, category, availability)
├── View details, then book a slot
├── Pay (eSewa/Khalti sandbox or Cash on Delivery)
└── View and cancel their own bookings

Dashboard
├── Counts: total bookings, pending, confirmed
└── Revenue summary
```

**This spine alone is not enough for a good mark.** It is what you inherit from the course. Marks come from the **two or three extra features** you add on top — the "Stands out because" column below is there to give you those.

---

## 2. The Title Ideas

Pick a row. The middle columns show how BookMyRoom's concepts map onto your domain — that mapping is your head start.

| # | Project title | Provider role | Customer role | What gets booked | Stands out because |
|---|--------------|---------------|---------------|------------------|-------------------|
| 1 | **Restaurant Table Booking System** | Restaurant owner | Diner | A table, for a date + time slot + party size | Table capacity matching (4 guests must not get a 2-seater), floor/section selection, pre-ordering from the menu |
| 2 | **Futsal Ground Booking System** | Ground owner | Player / team captain | A ground, per hourly slot | Hour-by-hour availability grid, recurring weekly bookings, day/night pricing, team vs team match requests |
| 3 | **Party Palace & Banquet Booking System** | Venue owner | Event host | Whole venue, per day or per shift | Package tiers (silver/gold), guest-count-based pricing, advance deposit then balance, catering menu add-ons |
| 4 | **Doctor Appointment Booking System** | Doctor / clinic | Patient | A consultation slot | Doctor availability schedule, specialisation search, token numbers, prescription history, no double-booking a slot |
| 5 | **Salon & Spa Appointment Booking** | Salon owner | Customer | A stylist's time slot | Per-service duration (a haircut is 30 min, colouring is 2 hr), staff-wise calendar, service bundles |
| 6 | **Vehicle Rental Booking System** | Vehicle owner | Renter | A car/bike, per day range | Licence document upload and verification, per-km vs per-day pricing, damage/security deposit, availability across date ranges |
| 7 | **Bus Ticket Booking System** | Bus operator | Passenger | A specific seat on a route + date | Visual seat map with locking, route and boarding points, one seat cannot be sold twice, e-ticket with QR |
| 8 | **Cinema Seat Booking System** | Cinema admin | Moviegoer | Seat(s) in a show | Seat map per show time, temporary seat hold with countdown, screen/show scheduling |
| 9 | **Event & Concert Ticket Booking** | Organiser | Attendee | Tickets in a tier | Ticket tiers with separate quotas, QR code check-in scanning, sold-out handling |
| 10 | **Home Tuition / Tutor Booking System** | Tutor | Student / parent | A tuition session | Subject and level matching, tutor verification badge, per-session vs monthly packages, rating and review after class |
| 11 | **Co-working Desk Booking System** | Space owner | Freelancer | A desk or cabin, hourly/daily/monthly | Floor plan with desk selection, monthly membership vs walk-in, check-in / check-out timing |
| 12 | **Photographer & Studio Booking** | Photographer / studio | Client | A shoot slot or studio hour | Portfolio gallery per provider, package builder (hours + edited photos), advance booking deposit |
| 13 | **Wedding Vendor Booking Platform** | Vendor (caterer, decorator, band) | Couple | Vendor's services for an event date | Multiple vendor categories in one booking, budget calculator, single event date locking several vendors |
| 14 | **Gym & Fitness Class Booking** | Gym / trainer | Member | A class slot or trainer session | Class capacity limits with a waiting list, membership plans, attendance streak tracking |
| 15 | **Home Service Booking System** (plumber, electrician) | Service worker | Householder | A visit slot at the customer's address | Location-based worker matching, job status flow (assigned → on the way → completed), post-job invoice |
| 16 | **Vehicle Servicing / Workshop Booking** | Workshop owner | Vehicle owner | A service bay slot | Service type checklist, estimated vs final cost, service history per vehicle number, reminder for next service |
| 17 | **Homestay & Trekking Lodge Booking** | Lodge owner | Trekker | A room on a trek route, per night | Route/altitude-based browsing, seasonal pricing, meal plan inclusion, group bookings |
| 18 | **Library Study Room & Seat Booking** | Library admin | Student | A seat or discussion room, per slot | Real-time seat occupancy map, daily booking quota per student, auto-release if not checked in |
| 19 | **Driving School Lesson Booking** | Driving instructor | Learner | A lesson slot with a vehicle | Instructor + vehicle both must be free, lesson progress tracker, course packages, test-date readiness |
| 20 | **Pet Grooming & Vet Appointment** | Groomer / vet | Pet owner | An appointment slot | Pet profiles (species, breed, age), vaccination record upload, service duration by pet size |
| 21 | **Parking Space Booking System** | Space owner | Driver | A parking bay, per hour | Live availability, overstay charge calculation, vehicle number plate record, map view |
| 22 | **Music Studio & Rehearsal Room Booking** | Studio owner | Band / artist | A room, per hour | Equipment add-ons (drum kit, amps), band member invites on one booking, off-peak rates |
| 23 | **Agro Equipment Rental** (tractor, thresher) | Equipment owner | Farmer | Equipment, per day/hour | Seasonal demand handling, operator-included option, village/ward-level search |
| 24 | **Cargo & Truck Load Booking** | Truck owner | Shipper | A truck for a route + date | Load weight and vehicle capacity matching, pickup/drop locations, per-km fare calculation, trip status tracking |

---

## 3. Five Worked Examples

If you want more detail before deciding, here are five expanded. Use the same thinking for any row above.

### A. Restaurant Table Booking System

**Mapping from BookMyRoom**: `Room` → `Table`, `Booking` → `Reservation`, `Owner` → `Restaurant Owner`.

| Collection | Key fields |
|-----------|-----------|
| `User` | name, email, password, role (`owner` \| `customer`), phone |
| `Restaurant` | ownerId, name, address, cuisine, images[], openingTime, closingTime |
| `Table` | restaurantId, tableNumber, seats, location (indoor/outdoor/rooftop) |
| `Reservation` | tableId, customerId, date, timeSlot, partySize, status, paymentMethod |

**The hard problem to solve (and to talk about in your viva)**: two customers booking the same table for the same 7pm slot. You must check for an overlapping reservation **before** saving, and enforce it with a unique index on `(tableId, date, timeSlot)`.

**Extra features for marks**: pre-order dishes with the reservation, auto-release the table if the customer is 15 minutes late, owner view of tonight's seating plan.

### B. Futsal Ground Booking System

**Mapping**: `Room` → `Ground`, `Booking` → `Slot Booking`.

The interesting part is the **time grid**. A ground is open 6am–10pm, so it has 16 hourly slots per day. Show the day as a grid, grey out taken slots, let the user pick one or more consecutive hours.

**Extra features**: recurring booking ("every Friday 7pm for a month"), higher night-time pricing under floodlights, a "find opponent" board where a team posts an open match.

### C. Doctor Appointment Booking System

**Mapping**: `Room` → `Doctor`, `Booking` → `Appointment`.

Each doctor defines their weekly availability (e.g. Sun–Fri, 10am–2pm, 15 minutes per patient). Your backend generates bookable slots from that schedule rather than storing every possible slot.

**Extra features**: token number on confirmation, patient's past visit history, prescription PDF upload by the doctor, filter by specialisation and fee.

### D. Vehicle Rental Booking System

**Mapping**: `Room` → `Vehicle`, `Booking` → `Rental`.

Bookings are **date ranges**, not single slots, so availability means "does this requested range overlap any existing rental?" That overlap query is the technical centrepiece — be ready to explain it.

**Extra features**: driving licence upload with owner approval before the rental confirms, security deposit held then refunded, late-return fine calculation.

### E. Bus Ticket Booking System

**Mapping**: `Room` → `Bus/Trip`, `Booking` → `Ticket`.

The seat map is what makes this stand out — and what makes it hard. Two people must never buy seat A3 on the same trip. Hold a seat for a few minutes while the passenger pays, then release it if the payment does not complete.

**Extra features**: boarding point selection along the route, QR e-ticket, operator dashboard of today's manifest.

---

## 4. Choosing Well

**Do:**
- Pick a domain you can **explain to a non-technical examiner in one sentence**.
- Pick something you can realistically finish. A working small system beats a half-finished ambitious one.
- Pick something where you can describe a **real user** — "a futsal owner in Chabahil who currently takes bookings over the phone".
- Add **two or three features that are genuinely yours**. This is where marks live.

**Do not:**
- Do not simply rename BookMyRoom's variables from `room` to `table` and submit it. Examiners have seen this, and the git history shows it.
- Do not choose a domain that needs data you cannot get (live flight schedules, real bank APIs).
- Do not promise machine learning, live chat and a mobile app all at once. Deliver the core well first.
- Do not leave payment until the last week. Use the **sandbox** credentials from Lesson 26.

**A good title states the system and its distinguishing capability:**

- Weak: *"Booking Website"*
- Better: *"Futsal Ground Booking System"*
- Strong: *"Futsal Ground Booking System with Slot-Based Availability and Opponent Matching"*

---

## 5. Questions to Expect in the Viva

Prepare answers for these before your defence. They apply to every project in this list:

**On the design**
1. Why did you choose Next.js for the frontend and Express for the backend, instead of one framework for both?
2. Draw your database schema. Why is this field on that collection and not the other one?
3. What is the relationship between your collections, and how do you query across them?

**On the hard parts**
4. What stops two users booking the same slot at the same moment? Show me that code.
5. What happens if the user closes the browser midway through payment?
6. How do you know a payment actually succeeded, and not just that the browser was redirected back?
7. Where do you validate input — frontend, backend, or both? Why both?

**On security**
8. Where is the password stored, and in what form?
9. What is inside your JWT? What happens if someone edits it?
10. A customer calls your provider-only API directly with Postman. What happens?
11. Can user A cancel user B's booking? Prove it.

**On the work itself**
12. Which part did each of you two write?
13. What was the hardest bug, and how did you find it?
14. What would you change if you started again?
15. What did you reuse from your course project, and what is your own?

> Question 15 is asked more often than students expect. Reusing course code is fine and expected — **be honest and specific** about which parts, and be ready to explain how the reused code works. Being unable to explain code you submitted is the fastest way to lose marks.

---

## 6. Group Allocation Tracker

Fill this in as titles come in. One domain per group — check the list before approving a title.

| Group | Member 1 | Member 2 | Project title | Approved |
|-------|----------|----------|---------------|----------|
| 1 | | | | ☐ |
| 2 | | | | ☐ |
| 3 | | | | ☐ |
| 4 | | | | ☐ |
| 5 | | | | ☐ |
| 6 | | | | ☐ |
| 7 | | | | ☐ |
| 8 | | | | ☐ |
| 9 | | | | ☐ |
| 10 | | | | ☐ |
| 11 | | | | ☐ |
| 12 | | | | ☐ |
| 13 | | | | ☐ |
| 14 | | | | ☐ |
| 15 | | | | ☐ |
