# TripWise 🌍

> A full-stack travel platform that combines destination booking with cultural awareness guidance through a chatbot, so travellers arrive informed and respectful.

![Node.js](https://img.shields.io/badge/Node.js-v22-green)
![Express](https://img.shields.io/badge/Express-v4-lightgrey)
![SQLite](https://img.shields.io/badge/Database-SQLite-blue)
![JWT](https://img.shields.io/badge/Auth-JWT-yellow)
![License](https://img.shields.io/badge/License-Academic-orange)

---

## Table of Contents

- [About](#about)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Dependencies](#dependencies)
- [Running the App](#running-the-app)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [User Roles](#user-roles)
- [API Routes](#api-routes)
- [Security](#security)
- [Author](#author)

---

## About

Most travel platforms help you book a trip but tell you nothing about how to behave when you get there. TripWise fixes that by embedding destination-specific cultural, legal, and etiquette guidance directly into the booking workflow.

When a traveller books a destination, they unlock access to a rule-based chatbot that answers questions about local laws, dress codes, religious customs, food, transport, safety, and more — drawing on a curated knowledge base enriched by verified local community contributors.

---

## Features

- **Rule-based chatbot** — 16 intent categories covering local laws, etiquette, dress codes, transport, food, safety, photography, nightlife, budget, religious sites, weather, timing, scams, solo travel, family travel, and emergencies
- **Learning Hub** — gamified quizzes with timed questions, combo scoring, speed bonuses, badge awards, and localStorage-based progress tracking across 10 destinations
- **Destination booking** — search, browse, and simulate bookings with dynamic accommodation loading and booking history
- **Three user roles** — Traveller, Administrator, and Local Community, each with separate interfaces and access controls
- **Secure auth** — JWT + bcrypt (salt factor 12), role-based access control, domain-based email validation, tiered API rate limiting
- **Community insights** — verified local contributors submit cultural insights that go through an admin moderation queue before enriching chatbot responses
- **Feedback system** — travellers rate chatbot interactions and overall travel experiences
- **Admin dashboard** — knowledge base management, insight moderation, feedback analytics, chatbot analytics, and user management
- **Password reset** — cryptographically secure in-memory token with 1-hour expiry and single-use invalidation

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js v22 |
| Framework | Express.js v4 |
| Database | SQLite (via sqlite3) |
| Authentication | JSON Web Tokens (jsonwebtoken) |
| Password hashing | bcryptjs |
| Security headers | helmet |
| Rate limiting | express-rate-limit |
| CORS | cors |
| Environment variables | dotenv |
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Dev tools | VS Code, Postman, GitHub, Draw.io |

---

## Prerequisites

Before running this project, make sure you have the following installed:

### Node.js

Download and install Node.js v18 or higher from:
https://nodejs.org/en/download

### Git

Download and install Git from:
https://git-scm.com/downloads

---

## Installation

### Step 1 — Clone the repository

```bash
git clone https://github.com/briolakumar/travelAI.git
```

### Step 2 — Navigate into the backend folder

```bash
cd travelAI/backend
```

### Step 3 — Install all dependencies

```bash
npm install
```

This will install everything listed in `package.json` automatically.

---

## Dependencies

### Production Dependencies

| Package | Purpose |
|---|---|
| `express` | Web framework for building the REST API |
| `sqlite3` | Lightweight relational database — file-based, no server required |
| `bcryptjs` | Password hashing with configurable salt rounds |
| `jsonwebtoken` | JWT generation and verification for stateless auth |
| `dotenv` | Loads environment variables from `.env` file |
| `helmet` | Sets secure HTTP response headers |
| `cors` | Enables controlled cross-origin resource sharing |
| `express-rate-limit` | Tiered API rate limiting to prevent abuse |

### Install all at once

```bash
npm install express sqlite3 bcryptjs jsonwebtoken dotenv helmet cors express-rate-limit
```

---

## Environment Variables

Create a `.env` file inside the `backend/` folder with the following:

```env
JWT_SECRET=your_secret_key_here
PORT=3000
```

> The `.env` file is not committed to the repository. You must create it manually before running the server.

---

## Running the App

```bash
cd backend
node server.js
```

### Health check

Once the server is running, verify it is working:

```
http://localhost:3000/health
```

You should see:

```json
{ "status": "Backend running" }
```

The server also automatically creates and seeds the SQLite database on first run if it does not already exist.

---

## Project Structure

```
travelAI/
├── html+css/
│   ├── api/
│   │   └── api.js                      # Shared frontend API utility
│   │                                   # Handles auth tokens, headers,
│   │                                   # and fetch error handling
│   ├── images/                         # Destination and UI images
│   ├── tripwise.css                    # Global stylesheet (all pages,
│   │                                   # scoped with body:has() selectors)
│   ├── homepage.html                   # Landing page — role selector
│   ├── traveller-login.html            # Traveller login
│   ├── traveller-register.html         # Traveller registration
│   ├── traveller-dashboard.html        # Traveller home after login
│   ├── search-destination.html         # Destination search
│   ├── search-results.html             # Search results grid
│   ├── destination-details.html        # Individual destination page
│   ├── booking-form.html               # Create a booking
│   ├── booking-history.html            # All bookings list
│   ├── booking-details.html            # Single booking detail
│   ├── booking-confirmation.html       # Booking confirmation screen
│   ├── chatbot-guidance.html           # Chatbot interface
│   ├── learning-home.html              # Learning Hub home
│   ├── learning-game.html              # Active quiz game
│   ├── learning-results.html           # Quiz results screen
│   ├── feedback.html                   # Submit feedback
│   ├── forgot-password.html            # Request password reset
│   ├── reset-password.html             # Enter new password
│   ├── notifications.html              # Notification centre
│   ├── admin-login.html                # Admin login
│   ├── admin-register.html             # Admin registration
│   ├── admin-dashboard.html            # Admin control panel
│   ├── localcommunities-login.html     # Community login
│   ├── localcommunities-register.html  # Community registration
│   └── localcommunities-dashboard.html # Community submission portal
│
└── backend/
    ├── routes/
    │   ├── admin.routes.js             # GET users, GET feedback,
    │   │                               # GET analytics
    │   ├── auth.routes.js              # POST register, POST login,
    │   │                               # GET me, POST forgot-password,
    │   │                               # POST reset-password
    │   ├── bookings.routes.js          # POST create, GET history,
    │   │                               # GET detail, DELETE cancel
    │   ├── chatbot.routes.js           # POST chat, GET history,
    │   │                               # GET session-summary,
    │   │                               # GET cultural-warning
    │   ├── destinations.routes.js      # GET all, GET by-slug,
    │   │                               # GET accommodations
    │   ├── feedback.routes.js          # POST submit, GET all
    │   ├── insights.routes.js          # POST submit, GET mine,
    │   │                               # GET moderation, POST status
    │   └── knowledgeBase.routes.js     # GET all, POST create,
    │                                   # DELETE entry, GET destinations,
    │                                   # GET categories
    ├── sql/
    │   ├── schema.sql                  # Database schema definitions
    │   └── data.sql                    # Seed data for destinations,
    │                                   # accommodations, and categories
    ├── middleware/
    │   ├── auth.js                     # JWT verification middleware
    │   └── requireRole.js              # Role-based access control
    ├── .env                            # NOT committed — create manually
    ├── db.js                           # SQLite connection module
    │                                   # Enables foreign keys, runs
    │                                   # schema on startup
    ├── destinations.js                 # Destination seed data loader
    ├── server.js                       # Express entry point
    │                                   # Middleware stack, route mounting,
    │                                   # static file serving, health check
    ├── package.json
    ├── package-lock.json
    └── tripwise.db                     # SQLite database (auto-created)
```

---

## Database Schema

The SQLite database is initialised automatically when the server starts for the first time. Schema is defined in `sql/schema.sql`.

| Table | Description |
|---|---|
| `users` | All registered users across all three roles |
| `countries` | Country reference data |
| `destinations` | Destination records with cultural metadata |
| `accommodations` | Accommodation options per destination |
| `bookings` | Traveller bookings linked to destinations |
| `categories` | Knowledge base categories |
| `knowledge_base` | Cultural and legal guidance entries |
| `chat_sessions` | One session per booking |
| `chat_messages` | Every chatbot message with intent and confidence score |
| `insights` | Community-submitted cultural insights |
| `chatbot_response_feedback` | Per-message thumbs up/down ratings |
| `feedback` | Overall user feedback submissions |

Foreign key constraints are enforced via `PRAGMA foreign_keys = ON` on every connection. Cascade deletes are configured so removing a user automatically removes their bookings, sessions, and messages.

> Password reset tokens are stored in an **in-memory Map** in `auth.routes.js` — not in the database. They expire after 1 hour and are invalidated immediately after use.

---

## User Roles

| Role | Email Domain | What They Can Do |
|---|---|---|
| Traveller | Any valid email | Search destinations, create bookings, use chatbot, Learning Hub, submit feedback |
| Administrator | `@tripwiseadmin.com` | Manage knowledge base, moderate insights, view feedback and analytics, manage users |
| Local Community | `@tripwisecommunity.com` | Submit cultural insights, track submission status |

Email domain validation is enforced server-side in `auth.routes.js` — it cannot be bypassed by the frontend.

---

## API Routes

All routes are prefixed with `/api`. Protected routes require a valid JWT in the `Authorization: Bearer <token>` header.

### Auth — `/api/auth`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/register` | None | Register a new user |
| POST | `/login` | None | Login and receive JWT |
| GET | `/me` | Required | Get current user details |
| POST | `/forgot-password` | None | Request password reset token (printed to terminal) |
| POST | `/reset-password` | None | Submit new password with token |

### Destinations — `/api/destinations`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | Required | Get all destinations with country names |
| GET | `/by-slug/:slug` | Required | Get single destination by slug |
| GET | `/:id/accommodations` | Required | Get accommodations for a destination |

### Bookings — `/api/bookings`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/` | Traveller | Create a new booking |
| GET | `/me` | Traveller | Get all bookings for current user |
| GET | `/:id` | Traveller | Get single booking detail |
| DELETE | `/:id` | Traveller | Cancel a booking |

### Chatbot — `/api/chatbot`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/chat` | Traveller | Send a message and receive guidance response |
| GET | `/history/:bookingId` | Traveller | Get full chat history for a booking |
| GET | `/session-summary/:bookingId` | Traveller | Get summary of topics covered |
| GET | `/cultural-warning/:destinationId` | Traveller | Get destination warning banner content |

### Knowledge Base — `/api/knowledge-base`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | Admin | Get all knowledge base entries |
| POST | `/` | Admin | Create a new entry |
| DELETE | `/:id` | Admin | Delete an entry |
| GET | `/destinations` | Admin | Get destinations list for dropdowns |
| GET | `/categories` | Admin | Get categories list for dropdowns |

### Insights — `/api/insights`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/` | Community | Submit a new insight |
| GET | `/mine` | Community | Get own submissions and their status |
| GET | `/moderation` | Admin | Get all submissions for moderation |
| POST | `/:id/status` | Admin | Set status to approved, rejected, or pending |

### Feedback — `/api/feedback`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/` | Traveller | Submit feedback with star rating |

### Admin — `/api/admin`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/users` | Admin | Get all registered users |
| GET | `/feedback` | Admin | Get all feedback with average rating |
| GET | `/analytics` | Admin | Get chatbot session and message counts |

---

## Security

| Measure | Implementation |
|---|---|
| Password hashing | bcrypt with salt factor 12 |
| Authentication | JWT with 1-day expiry |
| Email domain validation | Server-side only, role-specific |
| Rate limiting — Auth routes | 20 requests per 15 minutes per IP |
| Rate limiting — API routes | 200 requests per 15 minutes per IP |
| Rate limiting — Global | 500 requests per 15 minutes per IP |
| Security headers | Helmet applied to all responses |
| SQL injection prevention | Parameterised queries throughout |
| Ownership validation | Booking and chatbot endpoints verify user owns the resource |
| Role-based access control | `requireRole` middleware on all protected routes |
| Password reset tokens | In-memory only, single-use, 1-hour expiry |
| CORS | Configured via cors middleware |


---

## Author

**Briola Vathanakumar** (w1989031)

GitHub: [github.com/briolakumar/travelAI](https://github.com/briolakumar/travelAI)