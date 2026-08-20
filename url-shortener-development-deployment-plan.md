# URL Shortener Service — Complete Development & Deployment Plan

> **Goal:** Build and deploy a production-style URL Shortener Service for a backend skills demo.
>
> **Local development:** Fully Dockerized.
>
> **Cloud deployment:** AWS for application infrastructure + managed external data services.
>
> **Current scope:** Do **not** include Grafana yet.

---

# 1. Project Objectives

The system should support:

1. Optional user registration and login using email/password.
2. Creating a short URL from a long URL with or without login.
3. Redirecting a short URL to the original long URL.
4. Base62-based short code generation.
5. Redis caching for fast redirects and rate limiting.
6. Kafka-based asynchronous click/event tracking.
7. MongoDB-based analytics storage.
8. Analytics dashboard for users.
9. Cloud deployment with public HTTPS URLs.
10. Structured logging and basic observability through CloudWatch.
11. Dockerized local development.
12. Clean monorepo structure with Node.js + Next.js + TypeScript.
13. Anonymous short URL creation with automatic expiry after 2 days.
14. Public bulk URL-shortening endpoint without authentication.
15. Optional password-protected short URLs.

---

# 2. Final Technology Stack

## Frontend

- **Next.js**
- **TypeScript**
- **Tailwind CSS**
- **shadcn/ui**
- **Recharts**
- **npm**

## Backend API

- **Node.js**
- **TypeScript**
- **Fastify**
- **Zod**
- **Pino**
- **PostgreSQL**
- **Redis**
- **Kafka**
- **JWT Authentication**

## Analytics Worker

- **Node.js**
- **TypeScript**
- **KafkaJS**
- **MongoDB Node Driver**
- **User-Agent parser**

## Local Development

Use Docker Compose for:

- PostgreSQL
- Redis
- Kafka
- MongoDB

Run locally:

- Next.js frontend
- Node.js API
- Analytics worker

The frontend/API/worker can also be Dockerized, but during active development it is acceptable to run them directly with `npm run dev`.

## Production Deployment

### AWS

Use AWS for:

- **AWS Amplify** — Next.js frontend
- **Amazon ECS Fargate** — Backend API
- **Amazon ECS Fargate** — Analytics worker
- **Amazon ECR** — Docker images
- **Application Load Balancer** — API routing
- **AWS Certificate Manager** — HTTPS certificates
- **Route 53** — DNS
- **AWS Secrets Manager** — Secrets
- **CloudWatch** — Logs and metrics

### External Managed Data Services

Use:

- **Aiven PostgreSQL** — Primary application database
- **Upstash Redis** — Cache and rate limiting
- **Aiven Kafka** — Event/message bus
- **MongoDB Atlas** — Analytics database

---

# 3. Final Production Architecture

```text
                              User
                               │
                               ▼
                       Next.js Frontend
                         AWS Amplify
                               │
                               │ HTTPS
                               ▼
                    Application Load Balancer
                               │
                               ▼
                       ECS Fargate API
                      Node.js + TypeScript
                   ┌───────────┼───────────┐
                   │           │           │
                   ▼           ▼           ▼
          Aiven PostgreSQL   Upstash     Aiven Kafka
                              Redis          │
                                             ▼
                                      ECS Fargate
                                    Analytics Worker
                                             │
                                             ▼
                                      MongoDB Atlas
                                             │
                                             ▼
                                      Analytics API
                                             │
                                             ▼
                                      Next.js Dashboard


             Logs / Metrics
                    │
                    ▼
               CloudWatch
```

---

# 4. Local Development Architecture

Everything required for local infrastructure should run with Docker Compose.

```text
                              Browser
                                │
                                ▼
                         Next.js Frontend
                           localhost:3000
                                │
                                ▼
                          Node.js API
                           localhost:4000
                    ┌───────────┼───────────┐
                    │           │           │
                    ▼           ▼           ▼
                PostgreSQL    Redis       Kafka
                 Docker       Docker      Docker
                                            │
                                            ▼
                                     Analytics Worker
                                            │
                                            ▼
                                        MongoDB
                                         Docker
```

---

# 5. Monorepo Structure

Recommended structure:

```text
url-shortener/
│
├── apps/
│   ├── web/
│   │   ├── app/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── package.json
│   │
│   ├── api/
│   │   ├── src/
│   │   │   ├── config/
│   │   │   ├── middleware/
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   ├── links/
│   │   │   │   ├── redirects/
│   │   │   │   └── analytics/
│   │   │   ├── repositories/
│   │   │   ├── infrastructure/
│   │   │   │   ├── postgres/
│   │   │   │   ├── redis/
│   │   │   │   └── kafka/
│   │   │   ├── utils/
│   │   │   └── server.ts
│   │   └── package.json
│   │
│   └── analytics-worker/
│       ├── src/
│       │   ├── config/
│       │   ├── consumers/
│       │   ├── parsers/
│       │   ├── repositories/
│       │   └── consumer.ts
│       └── package.json
│
├── packages/
│   ├── shared/
│   │   ├── types/
│   │   ├── schemas/
│   │   ├── constants/
│   │   └── events/
│   │
│   ├── tsconfig/
│   └── eslint-config/
│
├── infra/
│   ├── docker/
│   └── aws/
│
├── docker-compose.yml
├── turbo.json
├── package.json
├── .env.example
└── README.md
```

---

# 6. Suggested Workspace Setup

Use:

- npm workspaces
- Turborepo
- strict TypeScript settings

Example root `package.json` workspace configuration:

```json
{
  "name": "url-shortener",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ]
}
```

Example root `package.json`:

```json
{
  "name": "url-shortener",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck"
  }
}
```

---

# 7. TypeScript Configuration

Enable strict options.

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

---

# 8. Core Domain Modules

The backend should be separated into modules.

```text
Auth Module
  ├── register
  ├── login
  ├── refresh token
  ├── logout
  └── current user

Links Module
  ├── create short URL
  ├── create anonymous short URL
  ├── create bulk short URLs
  ├── list user's URLs
  ├── get URL details
  ├── update URL
  ├── configure password protection
  ├── disable URL
  └── delete URL

Redirect Module
  ├── resolve short code
  ├── validate link password when required
  ├── cache lookup
  ├── database fallback
  ├── emit click event
  └── redirect

Analytics Module
  ├── overview
  ├── time-series
  ├── browsers
  ├── devices
  ├── countries
  └── referrers
```

Recommended layering:

```text
Controller
   ↓
Service
   ↓
Repository Interface
   ↓
Infrastructure Implementation
```

---

# 9. Database Design — PostgreSQL

PostgreSQL is the primary operational database.

Main reasons:

- Users and links have relational structure.
- Unique constraints are important.
- Foreign keys are useful.
- Base62 generation benefits from numeric auto-increment IDs.
- SQL concepts are useful to demonstrate in an interview.

---

# 10. PostgreSQL Schema

## Users

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Links

```sql
CREATE TABLE links (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  user_id UUID REFERENCES users(id),

  long_url TEXT NOT NULL,
  short_code VARCHAR(32) UNIQUE,

  title VARCHAR(255),

  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
  password_hash TEXT,

  expires_at TIMESTAMPTZ,

  redirect_type SMALLINT NOT NULL DEFAULT 302,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Sessions

```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY,

  user_id UUID NOT NULL REFERENCES users(id),

  refresh_token_hash TEXT NOT NULL,

  expires_at TIMESTAMPTZ NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Indexes

```sql
CREATE UNIQUE INDEX idx_users_email
ON users(email);

CREATE UNIQUE INDEX idx_links_short_code
ON links(short_code);

CREATE INDEX idx_links_user_created
ON links(user_id, created_at DESC);

CREATE INDEX idx_links_anonymous_expires
ON links(expires_at)
WHERE is_anonymous = TRUE;

CREATE INDEX idx_sessions_user
ON sessions(user_id);
```

Notes:

- `user_id` is nullable so anonymous users can create short URLs.
- Anonymous links must set `is_anonymous = TRUE` and `expires_at = created_at + interval '2 days'`.
- Authenticated links may keep `expires_at = NULL` unless the user explicitly sets an expiration.
- `password_hash` stores only a hash of the optional link password. Never store link passwords in plaintext.

---

# 11. Base62 URL Generation

Character set:

```text
abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789
```

Base62 has exactly 62 values.

Important:

Do **not** implement Base62 by simply splitting the binary form into 6-bit chunks.

Six bits provide 64 possibilities, not 62.

Correct Base62 uses repeated division by 62.

Example implementation:

```ts
const BASE62 =
  process.env.BASE62_ALPHABET ??
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export function encodeBase62(value: bigint): string {
  if (value === 0n) {
    return BASE62[0]!;
  }

  let result = "";

  while (value > 0n) {
    const remainder = Number(value % 62n);

    result = BASE62[remainder]! + result;

    value = value / 62n;
  }

  return result;
}
```

---

# 12. Shuffled Base62 Alphabet

To make IDs less predictable, use a shuffled alphabet.

Example:

```env
BASE62_ALPHABET=q7WmAdBz...
```

The Base62 algorithm remains identical.

Only the mapping changes.

Important:

This provides **obfuscation**, not cryptographic security.

Do not call it encryption.

Do not casually rotate the alphabet because existing short URLs would break.

Store the alphabet in:

- local `.env`
- AWS Secrets Manager in production

---

# 13. Short URL Creation Flow

Request:

```http
POST /v1/links
Authorization: Bearer <token>  # optional
Content-Type: application/json
```

Body:

```json
{
  "url": "https://example.com/a/very/long/url",
  "password": "optional-link-password"
}
```

Backend flow:

```text
Read optional authenticated user
      ↓
Validate URL using Zod
      ↓
If unauthenticated, set anonymous expiry to 2 days
      ↓
If password is provided, hash it with Argon2id or bcrypt
      ↓
Insert row into PostgreSQL
      ↓
PostgreSQL generates numeric ID
      ↓
Base62(ID)
      ↓
Update short_code
      ↓
Store URL in Redis
      ↓
Return short URL
```

Example:

```text
Database ID:
79382

Base62:
kEZ

Generated URL:
https://go.example.com/kEZ
```

Behavior:

- Authenticated users can manage links, view analytics, disable links, update links, and create non-expiring links.
- Unauthenticated users can create short URLs, but those links expire automatically after 2 days.
- Anonymous links are not attached to a dashboard account and cannot be managed later unless a future claim-token feature is added.
- Password-protected links should not redirect directly until the correct password is provided.

---

# 14. Redirect Status Code

Use:

```http
302 Found
```

by default.

Do not use `301` as the default for an analytics-focused URL shortener.

Reason:

Browsers, proxies, and CDNs may cache permanent redirects.

Future clicks may bypass your backend, which causes click analytics to become inaccurate.

Use:

```text
Active URL:
302

Disabled URL:
410 Gone

Expired URL:
410 Gone

Unknown URL:
404 Not Found
```

---

# 15. Redis Responsibilities

Redis should be used for:

1. Hot URL cache.
2. Rate limiting.
3. Optional temporary counters.

Recommended keys:

```text
url:<shortCode>

ratelimit:create:<userId>
ratelimit:create:anon:<ipAddress>
ratelimit:bulk:<ipAddress>

ratelimit:login:<ipAddress>
```

Example cached URL:

```json
{
  "longUrl": "https://example.com/...",
  "isActive": true,
  "expiresAt": null,
  "requiresPassword": false
}
```

---

# 16. Cache-Aside Strategy

Redirect flow:

```text
GET /kEZ
   ↓
Redis GET url:kEZ
   │
   ├── HIT
   │     ↓
   │   redirect
   │
   └── MISS
         ↓
      PostgreSQL
         ↓
      Redis SET
         ↓
      redirect
```

When a URL is:

- modified
- disabled
- deleted

invalidate the cache:

```text
DEL url:<shortCode>
```

---

# 17. Authentication

Use:

- Email/password
- JWT access token
- Refresh token
- Password hashing

Recommended:

```text
Access Token:
15 minutes

Refresh Token:
7 days
```

Password:

- Prefer Argon2id
- bcrypt is acceptable if dependency simplicity is more important

Refresh tokens should not be stored in plaintext.

Store a hash such as:

```text
SHA-256(refreshToken)
```

---

# 18. Auth Endpoints

```text
POST /v1/auth/register
POST /v1/auth/login
POST /v1/auth/refresh
POST /v1/auth/logout
GET  /v1/auth/me
```

---

# 19. Link Endpoints

```text
POST   /v1/links                      # authentication optional
POST   /v1/links/bulk                 # public, unauthenticated
GET    /v1/links                      # authentication required
GET    /v1/links/:shortCode           # authentication required for owner details
PATCH  /v1/links/:shortCode           # authentication required
DELETE /v1/links/:shortCode           # authentication required
```

Bulk request:

```http
POST /v1/links/bulk
Content-Type: application/json
```

```json
{
  "urls": [
    "https://example.com/a",
    "https://example.com/b"
  ]
}
```

Bulk response:

```json
{
  "links": [
    {
      "url": "https://example.com/a",
      "shortCode": "kEZ",
      "shortUrl": "https://go.example.com/kEZ",
      "expiresAt": "2026-08-22T05:20:00.000Z"
    }
  ]
}
```

Bulk endpoint rules:

- No authentication is required.
- Apply strict request-size and URL-count limits, for example 20 URLs per request.
- Apply IP-based rate limiting and abuse protection.
- Created links should follow anonymous-link behavior and expire after 2 days.
- Return per-item validation errors instead of failing the whole request when only some URLs are invalid.

---

# 20. Redirect Endpoint

```text
GET /:shortCode
POST /:shortCode/password
```

Example:

```text
GET /kEZ
```

Flow:

```text
Request
   ↓
Redis
   │
   ├── HIT
   │
   └── MISS → PostgreSQL → cache
   ↓
publish click event to Kafka
   ↓
302 redirect
```

Password-protected redirect flow:

```text
GET /kEZ
   ↓
Resolve link
   ↓
Password required?
   ├── no  → publish click event → 302 redirect
   └── yes → return password page or 401 JSON response

POST /kEZ/password
   ↓
Validate password against password_hash
   ↓
If valid, issue short-lived signed redirect token or secure cookie
   ↓
302 redirect
```

Implementation effort for password-protected links:

```text
Database changes:
Add password_hash to links and update create/update schemas.
Effort: Small

API changes:
Accept optional password during link creation, hash it, and expose password validation endpoint.
Effort: Medium

Redirect changes:
Detect protected links, block direct redirect, validate submitted password, then redirect.
Effort: Medium

Frontend changes:
Add password field in create-link form and password entry page for protected links.
Effort: Medium

Security work:
Rate limit password attempts, avoid plaintext storage, avoid leaking whether a code exists, and log failed attempts.
Effort: Medium

Testing:
Add unit/integration tests for protected creation, wrong password, correct password, expiry, cache behavior, and analytics event emission.
Effort: Medium
```

Important requirement:

**Kafka failure must not stop the redirect.**

Bad design:

```text
Kafka unavailable
   ↓
500 error
```

Correct behavior:

```text
Kafka unavailable
   ↓
log error
   ↓
still redirect user
```

The main business functionality must remain available.

---

# 21. Kafka Topic Design

Start with one topic:

```text
click-events
```

Recommended number of partitions for demo:

```text
3
```

A higher partition count is not necessary for a small demo.

---

# 22. Kafka Click Event Schema

```json
{
  "eventId": "01JEXAMPLE123",
  "eventType": "URL_CLICKED",
  "version": 1,

  "shortCode": "kEZ",
  "linkId": "79382",
  "ownerId": "user-uuid",

  "timestamp": "2026-08-20T05:20:00.000Z",

  "userAgent": "Mozilla/5.0 ...",
  "referrer": "https://google.com",

  "ip": "1.2.3.4",

  "requestId": "req-123"
}
```

Always include:

```text
eventId
eventType
version
timestamp
requestId
```

---

# 23. Kafka Consumer Group

Analytics worker should use:

```text
analytics-consumers
```

Architecture:

```text
Kafka click-events
      ↓
analytics-consumers
      ↓
Worker 1

Future scaling:

Kafka
 ├── Worker 1
 ├── Worker 2
 └── Worker 3
```

Kafka partitions allow workers to scale horizontally.

---

# 24. Analytics Worker Responsibilities

The worker should:

1. Consume click events.
2. Validate event schema.
3. Parse user agent.
4. Derive browser.
5. Derive operating system.
6. Derive device type.
7. Derive referrer domain.
8. Optionally derive country.
9. Store event in MongoDB.
10. Commit Kafka offset after successful processing.

---

# 25. MongoDB Analytics Schema

Collection:

```text
click_events
```

Example:

```json
{
  "eventId": "01JEXAMPLE123",

  "shortCode": "kEZ",
  "linkId": "79382",
  "ownerId": "user-uuid",

  "timestamp": "2026-08-20T05:20:00.000Z",

  "browser": "Chrome",
  "os": "macOS",
  "device": "Desktop",

  "country": "IN",

  "referrer": "google.com",

  "ipHash": "hashed-value",

  "userAgent": "Mozilla/5.0 ...",

  "requestId": "req-123"
}
```

Recommended indexes:

```javascript
db.click_events.createIndex(
  { eventId: 1 },
  { unique: true }
);

db.click_events.createIndex(
  { shortCode: 1, timestamp: -1 }
);

db.click_events.createIndex(
  { ownerId: 1, timestamp: -1 }
);
```

---

# 26. Idempotency

Kafka consumers may process the same event more than once.

Protect analytics by making `eventId` unique.

```text
Kafka Event
   ↓
Mongo insert
   ↓
eventId already exists?
   ↓
Ignore duplicate
```

This gives you effectively idempotent processing at the application level.

---

# 27. Analytics Endpoints

```text
GET /v1/links/:shortCode/analytics

GET /v1/links/:shortCode/analytics/timeseries

GET /v1/links/:shortCode/analytics/devices

GET /v1/links/:shortCode/analytics/browsers

GET /v1/links/:shortCode/analytics/referrers

GET /v1/links/:shortCode/analytics/countries
```

Example:

```json
{
  "totalClicks": 4382,
  "uniqueVisitors": 2911,
  "clicksToday": 482,

  "topBrowser": "Chrome",
  "topCountry": "India",

  "clicksOverTime": [
    {
      "date": "2026-08-18",
      "clicks": 603
    },
    {
      "date": "2026-08-19",
      "clicks": 824
    }
  ]
}
```

---

# 28. Frontend Pages

Recommended pages:

```text
/
 /login
 /register

/dashboard
/dashboard/links
/dashboard/links/:shortCode
/dashboard/settings
```

---

# 29. Landing Page

Suggested layout:

```text
┌─────────────────────────────────────────────────┐
│ Shorty                       Login   Sign Up     │
│                                                 │
│        Short links. Powerful analytics.         │
│                                                 │
│ [ Paste your long URL....................... ]  │
│                     [ Shorten URL ]              │
│                                                 │
│ Fast redirects • Analytics • Secure             │
└─────────────────────────────────────────────────┘
```

---

# 30. Dashboard UI

```text
┌───────────────┬─────────────────────────────────────┐
│               │ Dashboard                           │
│ Dashboard     │                                     │
│ Links         │ + Create Short Link                 │
│ Analytics     │                                     │
│ Settings      │ ┌────────┐ ┌────────┐ ┌────────┐   │
│               │ │ Links  │ │ Clicks │ │Visitors│   │
│               │ │   26   │ │ 18.2k  │ │ 12.3k  │   │
│               │ └────────┘ └────────┘ └────────┘   │
│               │                                     │
│               │ Clicks Over Time                    │
│               │ ┌────────────────────────────────┐  │
│               │ │            chart               │  │
│               │ └────────────────────────────────┘  │
│               │                                     │
│               │ Recent Links                        │
└───────────────┴─────────────────────────────────────┘
```

---

# 31. Links Table

Columns:

```text
Short URL

Original URL

Clicks

Created At

Status

Actions
```

Actions:

```text
Copy

Open

Analytics

Disable

Delete

QR Code
```

---

# 32. Link Analytics Page

Show KPI cards:

```text
Total Clicks

Unique Visitors

Clicks Today

Top Country
```

Charts:

```text
Clicks Over Time

Browsers

Operating Systems

Devices

Countries

Referrers
```

Use:

```text
Recharts
```

for application analytics.

---

# 33. Rate Limiting

Redis should implement rate limiting.

Example:

```text
Create URL:
20 requests/minute/user

Anonymous Create URL:
10 requests/minute/IP

Bulk Create URL:
5 requests/minute/IP

Login:
5 failed attempts/minute/IP
```

Possible Redis key:

```text
ratelimit:create:<userId>:<minute>
ratelimit:create:anon:<ip>:<minute>
ratelimit:bulk:<ip>:<minute>

ratelimit:login:<ip>:<minute>
```

Return:

```http
429 Too Many Requests
```

when the limit is exceeded.

---

# 34. Request IDs

Every incoming API request should receive a request ID.

Example:

```text
Request:
requestId=abc123

API Log:
requestId=abc123

Kafka Event:
requestId=abc123

Worker Log:
requestId=abc123

Mongo Event:
requestId=abc123
```

This makes debugging asynchronous flows significantly easier.

---

# 35. Structured Logging

Use Pino.

Avoid:

```ts
console.log("redirect started");
```

Prefer:

```json
{
  "level": "info",
  "requestId": "abc123",
  "method": "GET",
  "path": "/kEZ",
  "shortCode": "kEZ",
  "cache": "HIT",
  "responseTimeMs": 8
}
```

Local logs can print to console.

Production logs should go to CloudWatch through ECS.

---

# 36. Health Endpoints

Add:

```text
GET /health

GET /ready
```

Example:

```json
{
  "status": "ok"
}
```

`/ready` can optionally check:

- PostgreSQL
- Redis
- Kafka connectivity

Do not make `/health` expensive.

---

# 37. Swagger / OpenAPI

Add API documentation.

Recommended endpoint:

```text
/docs
```

Document:

- request body
- response
- authentication
- status codes
- examples

This has high interview impact for relatively low effort.

---

# 38. URL Expiration

Allow:

```text
Never

1 day

7 days

30 days

Custom
```

Store:

```text
expires_at
```

On redirect:

```text
if expired:
410 Gone
```

Also remove stale Redis cache entries.

---

# 39. Custom Alias

Allow:

```text
https://go.example.com/my-resume
```

instead of:

```text
https://go.example.com/kEZ
```

Create request:

```json
{
  "url": "https://example.com/resume.pdf",
  "customAlias": "my-resume"
}
```

PostgreSQL unique constraint protects against duplicate aliases.

---

# 40. QR Code

Allow generating QR codes for shortened URLs.

Example:

```text
https://go.example.com/kEZ
```

Frontend action:

```text
[ Copy ]
[ Open ]
[ QR Code ]
```

This is low effort but visually impressive.

---

# 41. Dockerized Local Infrastructure

Use Docker Compose.

Recommended services:

```text
postgres

redis

kafka

mongodb
```

Optional:

```text
kafka-ui
```

Kafka UI can be useful locally for debugging.

---

# 42. Example Docker Compose

```yaml
services:
  postgres:
    image: postgres:17
    container_name: shortener-postgres

    environment:
      POSTGRES_USER: shortener
      POSTGRES_PASSWORD: shortener
      POSTGRES_DB: shortener

    ports:
      - "5432:5432"

    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    container_name: shortener-redis

    ports:
      - "6379:6379"

    command:
      redis-server --appendonly yes

    volumes:
      - redis_data:/data

  mongodb:
    image: mongo:8
    container_name: shortener-mongodb

    ports:
      - "27017:27017"

    volumes:
      - mongo_data:/data/db

  kafka:
    image: bitnami/kafka:latest
    container_name: shortener-kafka

    ports:
      - "9092:9092"

    environment:
      KAFKA_CFG_NODE_ID: 1

      KAFKA_CFG_PROCESS_ROLES: broker,controller

      KAFKA_CFG_CONTROLLER_QUORUM_VOTERS: 1@kafka:9093

      KAFKA_CFG_LISTENERS: PLAINTEXT://:9092,CONTROLLER://:9093

      KAFKA_CFG_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092

      KAFKA_CFG_CONTROLLER_LISTENER_NAMES: CONTROLLER

      KAFKA_CFG_INTER_BROKER_LISTENER_NAME: PLAINTEXT

      KAFKA_CFG_LISTENER_SECURITY_PROTOCOL_MAP:
        CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT

      ALLOW_PLAINTEXT_LISTENER: "yes"

volumes:
  postgres_data:
  redis_data:
  mongo_data:
```

---

# 43. Local Environment Variables

Example `.env.example`:

```env
NODE_ENV=development

API_PORT=4000

WEB_URL=http://localhost:3000

PUBLIC_SHORT_BASE_URL=http://localhost:4000

DATABASE_URL=postgresql://shortener:shortener@localhost:5432/shortener

REDIS_URL=redis://localhost:6379

KAFKA_BROKERS=localhost:9092

KAFKA_CLIENT_ID=url-shortener-api

KAFKA_CLICK_TOPIC=click-events

KAFKA_ANALYTICS_GROUP=analytics-consumers

MONGO_URI=mongodb://localhost:27017/url_shortener_analytics

JWT_ACCESS_SECRET=local-access-secret

JWT_REFRESH_SECRET=local-refresh-secret

BASE62_ALPHABET=abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789
```

Never commit the real `.env`.

Commit only:

```text
.env.example
```

---

# 44. Local Development Startup

From project root:

```bash
docker compose up -d
```

Check:

```bash
docker compose ps
```

Install dependencies:

```bash
npm install
```

Run migrations:

```bash
npm run db:migrate
```

Create Kafka topic if needed:

```bash
npm run kafka:create-topics
```

Start all applications:

```bash
npm run dev
```

Expected:

```text
Frontend:
http://localhost:3000

API:
http://localhost:4000

PostgreSQL:
localhost:5432

Redis:
localhost:6379

Kafka:
localhost:9092

MongoDB:
localhost:27017
```

---

# 45. Minimum Local Success Flow

Do not deploy until all of these work locally.

```text
1. Register user

2. Login

3. Create long URL

4. Receive short code

5. Open short URL

6. Redis lookup works

7. PostgreSQL fallback works

8. Redirect succeeds

9. API publishes Kafka event

10. Analytics worker consumes Kafka event

11. MongoDB receives click event

12. Analytics API returns the click

13. Dashboard displays analytics
```

---

# 46. Local Testing Scenarios

Test these manually.

## Authentication

```text
Register success

Duplicate email

Wrong password

Expired access token

Refresh token
```

## URL Creation

```text
Valid URL

Anonymous URL

Anonymous URL expires after 2 days

Bulk URL request

Partial validation failure in bulk URL request

Invalid URL

Custom alias

Duplicate alias

Expired URL

Password-protected URL
```

## Redirect

```text
Redis HIT

Redis MISS

Unknown code

Disabled code

Password required

Wrong password

Correct password

Expired code

Kafka unavailable
```

## Analytics

```text
Event produced

Event consumed

Mongo insert

Duplicate event ignored
```

---

# 47. Unit Tests

At minimum test:

```text
Base62:
0
1
61
62
79
large values

Auth:
duplicate email
wrong password

Links:
invalid URL
duplicate alias
anonymous URL expiry
bulk URL creation
password hash is stored, not plaintext

Redirect:
cache hit
cache miss
disabled URL
password required
wrong password
correct password
expired URL

Kafka:
event schema
```

---

# 48. Integration Test

Create one strong end-to-end integration test.

```text
Create URL
    ↓
GET short URL
    ↓
302 redirect
    ↓
Kafka event
    ↓
worker
    ↓
MongoDB
    ↓
analytics count increased
```

This single test demonstrates most of the system.

---

# 49. Production Service Mapping

Local → Production:

| Local Service | Production Service |
|---|---|
| Next.js | AWS Amplify |
| Node API | ECS Fargate |
| Analytics Worker | ECS Fargate |
| Docker Images | Amazon ECR |
| PostgreSQL Docker | Aiven PostgreSQL |
| Redis Docker | Upstash Redis |
| Kafka Docker | Aiven Kafka |
| MongoDB Docker | MongoDB Atlas |
| localhost URL | ALB + Route53 |
| local HTTP | ACM HTTPS |
| `.env` secrets | AWS Secrets Manager |
| local logs | CloudWatch |

---

# 50. Production Deployment Order

Deploy in this order.

```text
1. Create Aiven PostgreSQL

2. Create Upstash Redis

3. Create Aiven Kafka

4. Create MongoDB Atlas

5. Create AWS ECR

6. Dockerize backend

7. Push Docker image to ECR

8. Create ECS cluster

9. Create Secrets Manager secrets

10. Create ECS API task definition

11. Create Application Load Balancer

12. Create ECS API service

13. Create ECS analytics-worker task definition

14. Create ECS analytics-worker service

15. Test API through ALB

16. Configure Route53 + ACM

17. Deploy Next.js through Amplify

18. Connect frontend custom domain

19. Run complete production demo flow
```

---

# 51. Aiven PostgreSQL

Create one PostgreSQL service.

Recommended database:

```text
url_shortener
```

Production connection:

```env
DATABASE_URL=postgresql://...
```

Use SSL.

Do not expose credentials in code.

---

# 52. Upstash Redis

Create one Redis database.

Use for:

```text
URL cache

Rate limiting
```

Production config:

```env
REDIS_URL=rediss://...
```

Make sure TLS is enabled.

---

# 53. Aiven Kafka

Create one Kafka service.

Create:

```text
Topic:
click-events
```

Recommended:

```text
Partitions:
3
```

Configure Node Kafka client using the credentials provided by Aiven.

The application should depend on Kafka interfaces, not Aiven-specific business logic.

---

# 54. MongoDB Atlas

Create database:

```text
url_shortener_analytics
```

Collection:

```text
click_events
```

Production:

```env
MONGO_URI=mongodb+srv://...
```

Restrict network access as much as practical.

---

# 55. AWS ECR

Create repository:

```text
url-shortener-backend
```

Build:

```bash
docker build -t url-shortener-backend .
```

Authenticate to ECR.

Tag image.

Push:

```bash
docker push <ECR_URL>:latest
```

Use versioned tags later:

```text
v1.0.0

git-commit-sha
```

instead of relying only on `latest`.

---

# 56. ECS Design

Use one ECS cluster:

```text
url-shortener-cluster
```

Create two services:

```text
url-shortener-api-service

url-shortener-analytics-worker-service
```

Same Docker image can be used.

Different commands:

```text
API:
node apps/api/dist/server.js

Worker:
node apps/analytics-worker/dist/consumer.js
```

---

# 57. ECS API Service

The API service needs:

```text
Container Port:
4000

Load Balancer:
Yes

Desired Tasks:
1
```

Health check:

```text
/health
```

Use CloudWatch logs.

---

# 58. ECS Analytics Worker

Worker:

```text
No public port

No load balancer

Desired Tasks:
1
```

Responsibilities:

```text
Consume Kafka

Transform events

Store analytics in MongoDB
```

---

# 59. Application Load Balancer

The ALB exposes the API publicly.

Recommended:

```text
api.example.com

go.example.com
```

Both may point to the same backend service.

Routing:

```text
https://api.example.com/v1/...

https://go.example.com/kEZ
```

---

# 60. Route53 + ACM

Recommended domains:

```text
app.example.com

api.example.com

go.example.com
```

Mappings:

```text
app.example.com
    ↓
AWS Amplify

api.example.com
    ↓
Application Load Balancer

go.example.com
    ↓
Application Load Balancer
```

Create ACM certificate:

```text
*.example.com
```

Enable HTTPS.

---

# 61. AWS Secrets Manager

Store:

```text
DATABASE_URL

REDIS_URL

KAFKA_BROKERS

KAFKA_USERNAME

KAFKA_PASSWORD

MONGO_URI

JWT_ACCESS_SECRET

JWT_REFRESH_SECRET

BASE62_ALPHABET
```

Non-secret settings can remain as normal ECS environment variables.

---

# 62. CloudWatch

Use CloudWatch for:

```text
API logs

Worker logs

ECS CPU

ECS memory

ALB request count

ALB 4xx

ALB 5xx

ALB response latency
```

Do not add Grafana yet.

CloudWatch is sufficient for the current project phase.

---

# 63. Next.js Deployment

Deploy `apps/web` using AWS Amplify.

Environment:

```env
NEXT_PUBLIC_API_URL=https://api.example.com

NEXT_PUBLIC_SHORT_URL=https://go.example.com
```

Connect:

```text
app.example.com
```

---

# 64. Production Environment Variables

Conceptual example:

```env
NODE_ENV=production

API_PORT=4000

WEB_URL=https://app.example.com

PUBLIC_SHORT_BASE_URL=https://go.example.com

DATABASE_URL=<AIVEN_POSTGRES_URL>

REDIS_URL=<UPSTASH_REDIS_URL>

KAFKA_BROKERS=<AIVEN_BROKERS>

KAFKA_USERNAME=<AIVEN_USERNAME>

KAFKA_PASSWORD=<AIVEN_PASSWORD>

KAFKA_CLICK_TOPIC=click-events

KAFKA_ANALYTICS_GROUP=analytics-consumers

MONGO_URI=<MONGODB_ATLAS_URI>

JWT_ACCESS_SECRET=<SECRET>

JWT_REFRESH_SECRET=<SECRET>

BASE62_ALPHABET=<SECRET_ALPHABET>
```

---

# 65. Repository Interfaces

Do not tightly couple business logic to vendors.

Example:

```ts
export interface CacheRepository {
  get(key: string): Promise<string | null>;

  set(
    key: string,
    value: string,
    ttlSeconds?: number
  ): Promise<void>;

  delete(key: string): Promise<void>;
}
```

Kafka:

```ts
export interface EventPublisher {
  publishClickEvent(event: ClickEvent): Promise<void>;
}
```

Links:

```ts
export interface LinkRepository {
  create(...): Promise<Link>;
  findByShortCode(shortCode: string): Promise<Link | null>;
  listByUser(userId: string): Promise<Link[]>;
}
```

Business services depend on interfaces.

Infrastructure decides whether the implementation is:

```text
Local Redis

Upstash Redis

Local Kafka

Aiven Kafka
```

This makes migration easier.

---

# 66. Recommended Backend Folder Example

```text
apps/api/src/modules/links/
│
├── link.controller.ts
├── link.service.ts
├── link.repository.ts
├── link.routes.ts
├── link.schemas.ts
└── link.types.ts
```

Redirect module:

```text
apps/api/src/modules/redirects/
│
├── redirect.controller.ts
├── redirect.service.ts
├── redirect.routes.ts
└── redirect.types.ts
```

---

# 67. Important Failure Handling

## Redis Down

```text
Redis unavailable
    ↓
PostgreSQL fallback
    ↓
redirect continues
```

## Kafka Down

```text
Kafka unavailable
    ↓
log analytics failure
    ↓
redirect continues
```

## Analytics Worker Down

```text
Kafka stores events
    ↓
worker restarts
    ↓
continues consuming
```

## MongoDB Down

```text
worker should not acknowledge event too early
```

Production enhancement:

```text
retry + DLQ
```

---

# 68. Dead Letter Queue — Optional Stretch Feature

Add later:

```text
click-events

click-events-dlq
```

Flow:

```text
click event
   ↓
analytics worker
   │
   ├── success → MongoDB
   │
   └── repeated failure
          ↓
      click-events-dlq
```

Very strong backend interview feature.

---

# 69. Security Checklist

Implement:

```text
Password hashing

JWT expiration

Refresh token rotation

Secure cookies if cookies are used

Input validation with Zod

URL validation

Rate limiting

CORS restrictions

Helmet/security headers

No credentials in Git

AWS Secrets Manager

HTTPS

Unique DB constraints

Authorization checks before link modification

SQL parameterization

Avoid logging passwords/tokens
```

---

# 70. Important Authorization Rule

Always ensure a user can modify only their own links.

Bad:

```text
PATCH /links/kEZ
```

without checking ownership.

Correct:

```text
Find link

Check:
link.userId === authenticatedUser.id

Then modify
```

---

# 71. Important Analytics Privacy Rule

Avoid unnecessarily storing raw IP addresses.

Preferred:

```text
hash(IP + secretSalt)
```

Use the hash for approximate unique visitor analysis.

---

# 72. Demo Traffic Generation

Before the interview, generate enough traffic so the dashboard does not look empty.

Generate approximately:

```text
200–1000 clicks
```

Use different:

```text
Browsers

Operating systems

Devices

Referrers

URLs
```

Do not claim synthetic traffic is real user traffic.

---

# 73. Demo Flow

Recommended interview demonstration:

```text
1. Open deployed frontend.

2. Register.

3. Login.

4. Create short URL.

5. Show generated Base62 short code.

6. Copy short URL.

7. Open short URL.

8. Show successful redirect.

9. Show Redis cache behavior in logs.

10. Show Kafka event being produced.

11. Show worker consuming event.

12. Show MongoDB analytics event.

13. Open analytics dashboard.

14. Show click count increased.

15. Show CloudWatch API/worker logs.

16. Show deployed AWS ECS services.

17. Explain architecture.
```

---

# 74. Interview Architecture Explanation

Recommended explanation:

> I separated the latency-sensitive redirect path from the analytics processing path.
>
> The API first resolves links through Redis using a cache-aside strategy, with PostgreSQL as the source of truth.
>
> On each redirect, the API produces a click event to Kafka. Analytics processing is asynchronous, so analytics failures do not block redirects.
>
> An independently scalable worker consumes Kafka events and writes analytics data to MongoDB.
>
> PostgreSQL stores transactional application data, while MongoDB handles click-event analytics.
>
> The API and worker are deployed as separate ECS Fargate services so they can scale independently.

---

# 75. Why PostgreSQL?

Answer:

```text
Users and links are relational.

Unique constraints matter.

Foreign keys are useful.

Transactions are useful.

Base62 uses numeric identity IDs naturally.

SQL is excellent for operational CRUD.
```

---

# 76. Why Redis?

Answer:

```text
URL shorteners are read-heavy.

Popular links receive repeated traffic.

Redis reduces PostgreSQL reads.

Redis gives low-latency redirects.

Redis can also implement rate limiting.
```

---

# 77. Why Kafka?

Answer:

```text
Analytics should not block redirect latency.

Kafka decouples producers and consumers.

Consumers can scale separately.

Events can be replayed.

Consumer groups provide horizontal scaling.
```

---

# 78. Why MongoDB?

Answer:

```text
Analytics events are document-shaped.

Event schema can evolve.

Mongo aggregation pipelines are useful.

Analytics workload stays separate from PostgreSQL OLTP workload.
```

---

# 79. Why Hybrid AWS + External Services?

Answer:

> The application uses standard PostgreSQL, Redis and Kafka protocols, so the business logic is not tied to a single cloud vendor.
>
> AWS handles compute, load balancing, HTTPS, secrets and logs, while developer-friendly managed providers handle the data infrastructure for this deployment.
>
> If required, PostgreSQL can later move to RDS, Redis to ElastiCache, and Kafka to MSK without redesigning the domain layer.

---

# 80. Migration Mapping Later

```text
Aiven PostgreSQL
       ↓
Amazon RDS PostgreSQL


Upstash Redis
       ↓
Amazon ElastiCache


Aiven Kafka
       ↓
Amazon MSK
```

The application architecture should remain mostly unchanged.

---

# 81. Features to Add After Core Flow Works

Priority order:

## High Priority

```text
Swagger/OpenAPI

Rate limiting

Structured logs

Request IDs

Custom aliases

URL expiration

Anonymous URL creation with 2-day expiry

Public bulk URL creation

Password-protected URLs

QR codes
```

## Medium Priority

```text
Dead-letter topic

Retry handling

Link tags/folders

Search/filter URLs
```

## Later

```text
OpenTelemetry tracing

CI/CD

Infrastructure as Code

Multi-region deployment
```

Do **not** add Grafana yet.

---

# 82. Development Priority

Follow this order.

## P0 — Must Work

```text
Monorepo

Docker Compose infrastructure

PostgreSQL schema

Register/login

Base62

Create short URL

Anonymous short URL expiry

Redirect

Redis caching

Kafka producer

Kafka worker

MongoDB analytics

Analytics API

Next.js dashboard

Docker backend

Cloud deployment
```

## P1 — Strong Interview Features

```text
Swagger

Rate limiting

Custom alias

Expiration

Public bulk URL creation

Password-protected URLs

QR

Structured logging

Request IDs

CloudWatch
```

## P2 — Later

```text
DLQ

CI/CD

OpenTelemetry

Infrastructure as Code

Multi-region
```

---

# 83. Critical Rule

Do not optimize architecture before the end-to-end flow works.

The system is successful when:

```text
Create URL
   ↓
Redirect
   ↓
Kafka
   ↓
Worker
   ↓
MongoDB
   ↓
Dashboard
```

works reliably.

Everything else comes after that.

---

# 84. Final Project Scope

The final version for the current interview should demonstrate:

```text
Authentication

Anonymous short URL creation

Node.js API design

TypeScript

PostgreSQL

Base62 algorithm

Redis caching

Rate limiting

Public bulk URL creation

Password-protected redirects

Kafka producers

Kafka consumers

Event-driven architecture

MongoDB analytics

Independent worker service

Docker

AWS ECS

AWS ECR

AWS ALB

HTTPS

Custom domain

Secrets Manager

CloudWatch

Next.js

Analytics dashboard
```

No Grafana for the current version.

---

# 85. Recommended Final URLs

Example:

```text
Frontend:
https://app.example.com

API:
https://api.example.com

Short URL:
https://go.example.com/kEZ

API Docs:
https://api.example.com/docs

Health:
https://api.example.com/health
```

---

# 86. Definition of Done

The project is ready for the interview when all of these are true:

- [ ] User can register.
- [ ] User can login.
- [ ] User can create a short URL.
- [ ] Anonymous user can create a short URL without login.
- [ ] Anonymous short URL expires automatically after 2 days.
- [ ] Public bulk endpoint returns short codes for a list of long URLs without authentication.
- [ ] Password-protected short URL blocks redirect until the correct password is provided.
- [ ] Short code is generated using Base62.
- [ ] Short URL redirects correctly.
- [ ] Redis caches resolved URLs.
- [ ] Cache miss falls back to PostgreSQL.
- [ ] Redirect publishes Kafka event.
- [ ] Worker consumes Kafka event.
- [ ] MongoDB stores click analytics.
- [ ] Dashboard displays analytics.
- [ ] Rate limiting works.
- [ ] Swagger is available.
- [ ] Structured logs contain request IDs.
- [ ] Local development works through Docker Compose.
- [ ] Backend API is deployed on ECS Fargate.
- [ ] Worker is deployed on ECS Fargate.
- [ ] Frontend is deployed on Amplify.
- [ ] PostgreSQL is running on Aiven.
- [ ] Redis is running on Upstash.
- [ ] Kafka is running on Aiven.
- [ ] Analytics database is running on MongoDB Atlas.
- [ ] API is accessible through HTTPS.
- [ ] Short URL uses a proper public domain.
- [ ] CloudWatch contains API and worker logs.
- [ ] Full demo has been rehearsed end-to-end.

---

# 87. Recommended Immediate Next Steps

Start in this exact order:

```text
Step 1:
Create monorepo.

Step 2:
Create Docker Compose:
Postgres + Redis + Kafka + MongoDB.

Step 3:
Build PostgreSQL schema.

Step 4:
Build register/login.

Step 5:
Build Base62 encoder.

Step 6:
Build short URL creation.

Step 7:
Build anonymous short URL creation with 2-day expiry.

Step 8:
Build redirect + Redis.

Step 9:
Add Kafka producer.

Step 10:
Build analytics worker.

Step 11:
Store events in MongoDB.

Step 12:
Build analytics APIs.

Step 13:
Build public bulk URL creation.

Step 14:
Build password-protected URL creation and redirect.

Step 15:
Build Next.js dashboard.

Step 16:
Dockerize backend.

Step 17:
Deploy managed databases.

Step 18:
Deploy AWS infrastructure.

Step 19:
Run full demo rehearsal.
```

---

# Final Principle

Keep the architecture simple enough to finish, but deep enough to explain.

The best interview version is not the one containing the most AWS services.

The best version is the one where you can confidently explain:

```text
Why PostgreSQL?

Why Redis?

Why Kafka?

Why MongoDB?

Why asynchronous analytics?

Why 302?

Why cache-aside?

Why separate API and worker?

How does the system behave when Redis fails?

How does the system behave when Kafka fails?

How do you prevent duplicate analytics?

How would you scale it?
```

If every one of those questions has a clear answer and the deployed system works end to end, this URL shortener becomes a strong backend skills demonstration.
