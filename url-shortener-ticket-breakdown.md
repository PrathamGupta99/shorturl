# URL Shortener Monorepo Ticket Breakdown

## Scope Summary

Build a production-style URL shortener monorepo using:

- Frontend: Next.js, TypeScript, Tailwind CSS, shadcn/ui, Recharts
- Backend API: Node.js, Express, TypeScript
- Worker: Node.js, TypeScript, KafkaJS
- Databases: PostgreSQL for operational data, MongoDB for analytics
- Cache and rate limiting: Redis
- Event bus: Kafka
- Local development: Docker Compose
- Production: AWS Amplify, ECS Fargate, ECR, ALB, ACM, Route 53, Secrets Manager, CloudWatch
- Package manager: npm workspaces

Authentication is optional for short URL creation. Logged-in users get management and analytics features. Anonymous users can create short URLs, but those links expire automatically after 2 days.

Out of scope: automated tests of any kind (unit, integration, or frontend) and API-documentation tooling such as Swagger/OpenAPI. Manual end-to-end verification for the final demo remains in scope.

## Estimate Summary

| Area | Estimate |
|---|---:|
| Core backend and infra | 10-15 days |
| Frontend dashboard | 4-6 days |
| Analytics pipeline | 3-5 days |
| Manual QA and hardening | 1-2 days |
| Deployment | 3-5 days |
| Total | 20-33 working days |

## Ticket Format

Each ticket includes:

- Priority: P0, P1, or P2
- Estimate: rough working effort
- Dependencies: tickets that should be done first
- Acceptance Criteria: concrete done conditions

---

# Epic 1: Monorepo and Tooling

## TICKET-001: Create npm Workspace Monorepo

Priority: P0  
Estimate: 0.5 day  
Dependencies: None

Description:
Create the initial npm workspace monorepo structure.

Tasks:

- Create root `package.json` with npm workspaces.
- Create `apps/web`.
- Create `apps/api`.
- Create `apps/analytics-worker`.
- Create `packages/shared`.
- Add root scripts for `dev`, `build`, `lint`, and `typecheck`.
- Add Turborepo configuration.

Acceptance Criteria:

- `npm install` works from the root.
- Workspace packages are discovered by npm.
- Root scripts can call workspace scripts.

## TICKET-002: Add Shared TypeScript and Lint Configuration

Priority: P0  
Estimate: 0.5 day  
Dependencies: TICKET-001

Description:
Create shared TypeScript and linting configuration for all apps.

Tasks:

- Add strict TypeScript base config.
- Add shared ESLint config.
- Add Prettier config.
- Configure path aliases where useful.

Acceptance Criteria:

- `npm run typecheck` works.
- `npm run lint` works.
- All apps use the same base TypeScript rules.

---

# Epic 2: Local Infrastructure

## TICKET-003: Add Docker Compose Infrastructure

Priority: P0  
Estimate: 1 day  
Dependencies: TICKET-001

Description:
Add local infrastructure services using Docker Compose.

Tasks:

- Add PostgreSQL service.
- Add Redis service.
- Add Kafka service.
- Add MongoDB service.
- Add health checks.
- Add local ports.
- Add `.env.example`.

Acceptance Criteria:

- `docker compose up -d` starts all infrastructure.
- PostgreSQL is reachable locally.
- Redis is reachable locally.
- Kafka is reachable locally.
- MongoDB is reachable locally.

## TICKET-004: Add Environment Configuration

Priority: P0  
Estimate: 0.5 day  
Dependencies: TICKET-003

Description:
Add typed environment loading for API and worker.

Tasks:

- Add environment schema validation.
- Add local `.env.example`.
- Validate database, Redis, Kafka, MongoDB, JWT, and Base62 settings.

Acceptance Criteria:

- API fails fast when required env vars are missing.
- Worker fails fast when required env vars are missing.
- `.env.example` documents all required values.

---

# Epic 3: Backend Foundation

## TICKET-005: Create Express TypeScript API App

Priority: P0  
Estimate: 1 day  
Dependencies: TICKET-001, TICKET-004

Description:
Set up the backend API using Node.js, Express, and TypeScript.

Tasks:

- Create Express app bootstrap.
- Add request JSON parsing.
- Add CORS configuration.
- Add health endpoint.
- Add error handler middleware.
- Add request ID middleware.
- Add Pino logging.

Acceptance Criteria:

- `GET /health` returns success.
- Server starts with `npm run dev`.
- Errors return consistent JSON responses.
- Logs include request IDs.

## TICKET-006: Add PostgreSQL Client and Migration Setup

Priority: P0  
Estimate: 1 day  
Dependencies: TICKET-003, TICKET-005

Description:
Add PostgreSQL connection and migration tooling.

Tasks:

- Configure PostgreSQL client.
- Add migration runner.
- Add users table.
- Add links table.
- Add sessions table.
- Add indexes.

Acceptance Criteria:

- `npm run db:migrate` creates all tables.
- Links support nullable `user_id`.
- Links support `is_anonymous`, `expires_at`, and `password_hash`.

---

# Epic 4: Authentication

## TICKET-007: Implement User Registration

Priority: P0  
Estimate: 1 day  
Dependencies: TICKET-006

Description:
Allow users to register with email and password.

Tasks:

- Add register request schema.
- Hash password with Argon2id or bcrypt.
- Enforce unique email.
- Return user-safe response.

Acceptance Criteria:

- User can register.
- Duplicate email is rejected.
- Password is never stored in plaintext.

## TICKET-008: Implement Login and JWT Tokens

Priority: P0  
Estimate: 1 day  
Dependencies: TICKET-007

Description:
Allow users to login and receive tokens.

Tasks:

- Validate email and password.
- Issue JWT access token.
- Issue refresh token.
- Store refresh token hash.

Acceptance Criteria:

- Valid login returns access and refresh tokens.
- Wrong password is rejected.
- Refresh token is stored only as a hash.

## TICKET-009: Implement Refresh, Logout, and Current User

Priority: P0  
Estimate: 1 day  
Dependencies: TICKET-008

Description:
Complete the auth session lifecycle.

Tasks:

- Add refresh token endpoint.
- Add logout endpoint.
- Add current user endpoint.
- Add auth middleware.

Acceptance Criteria:

- User can refresh an access token.
- User can logout.
- `GET /v1/auth/me` returns authenticated user.

---

# Epic 5: Link Creation

## TICKET-010: Implement Base62 Encoder

Priority: P0  
Estimate: 0.5 day  
Dependencies: TICKET-001

Description:
Add Base62 short code generation.

Tasks:

- Implement repeated-division Base62 encoder.
- Support configurable shuffled alphabet.

Acceptance Criteria:

- Encoder handles `0`, `1`, `61`, `62`, and large values.
- Encoder does not use incorrect 6-bit chunking.

## TICKET-011: Create Authenticated Short URL Endpoint

Priority: P0  
Estimate: 1.5 days  
Dependencies: TICKET-006, TICKET-009, TICKET-010

Description:
Allow logged-in users to create short URLs.

Tasks:

- Add `POST /v1/links`.
- Accept optional bearer token.
- Validate long URL.
- Insert link row.
- Generate Base62 short code from numeric ID.
- Store short code.
- Return short URL.

Acceptance Criteria:

- Logged-in user can create a short URL.
- Link is attached to the user.
- Link does not expire by default.

## TICKET-012: Support Anonymous Short URL Creation

Priority: P0  
Estimate: 1 day  
Dependencies: TICKET-011

Description:
Allow users to create short URLs without login.

Tasks:

- Make auth optional on `POST /v1/links`.
- If no user is authenticated, create anonymous link.
- Set `is_anonymous = true`.
- Set `expires_at` to 2 days after creation.
- Add IP-based rate limiting key.

Acceptance Criteria:

- Anonymous user can create a short URL.
- Anonymous link expires after 2 days.
- Anonymous link is not shown in any user dashboard.

## TICKET-013: Add Custom Alias and Expiration Support

Priority: P1  
Estimate: 1.5 days  
Dependencies: TICKET-011

Description:
Allow users to provide a custom alias and optional expiration date.

Tasks:

- Add optional `customAlias`.
- Validate alias format.
- Enforce unique alias.
- Add optional `expiresAt`.

Acceptance Criteria:

- User can create a link with a custom alias.
- Duplicate aliases are rejected.
- Expired links return `410 Gone`.

---

# Epic 6: Redirects and Redis

## TICKET-014: Add Redis Client and Cache-Aside Redirect Flow

Priority: P0  
Estimate: 1.5 days  
Dependencies: TICKET-003, TICKET-011

Description:
Resolve short URLs using Redis cache with PostgreSQL fallback.

Tasks:

- Add Redis client.
- Add `GET /:shortCode`.
- Check Redis first.
- Fallback to PostgreSQL on cache miss.
- Cache resolved link.
- Return `302 Found`.

Acceptance Criteria:

- Valid short URL redirects to long URL.
- Redis hit redirects correctly.
- Redis miss falls back to PostgreSQL.
- Unknown code returns `404`.
- Disabled or expired code returns `410`.

## TICKET-015: Add Cache Invalidation on Link Updates

Priority: P1  
Estimate: 0.5 day  
Dependencies: TICKET-014

Description:
Invalidate Redis cache when a link changes.

Tasks:

- Delete `url:<shortCode>` after update.
- Delete `url:<shortCode>` after disable.
- Delete `url:<shortCode>` after delete.

Acceptance Criteria:

- Updated links do not serve stale redirect data.

---

# Epic 7: Password-Protected URLs

## TICKET-016: Add Password Setup During Link Creation

Priority: P1  
Estimate: 1 day  
Dependencies: TICKET-011

Description:
Allow optional password protection while creating a short URL.

Tasks:

- Accept optional `password` in create link request.
- Hash password before storing.
- Store hash in `links.password_hash`.
- Return `requiresPassword` flag.

Acceptance Criteria:

- Password-protected link can be created.
- Plain password is never stored.
- API response does not expose password hash.

## TICKET-017: Add Password-Protected Redirect Flow

Priority: P1  
Estimate: 1.5 days  
Dependencies: TICKET-014, TICKET-016

Description:
Block redirects until the correct link password is provided.

Tasks:

- Detect protected links during redirect.
- Return password challenge page or `401` JSON response.
- Add `POST /:shortCode/password`.
- Validate submitted password.
- Issue short-lived signed redirect token or secure cookie.
- Redirect after successful password validation.

Acceptance Criteria:

- Protected link does not redirect without password.
- Wrong password is rejected.
- Correct password redirects to long URL.
- Password attempts are rate limited.

---

# Epic 8: Public Bulk Shortening

## TICKET-018: Add Public Bulk URL Shortening Endpoint

Priority: P1  
Estimate: 1.5 days  
Dependencies: TICKET-012

Description:
Expose an unauthenticated endpoint that accepts multiple long URLs and returns short codes.

Tasks:

- Add `POST /v1/links/bulk`.
- Accept array of long URLs.
- Enforce max URL count, for example 20.
- Validate each URL independently.
- Create anonymous links for valid URLs.
- Return per-item success or validation error.
- Apply IP-based rate limiting.

Acceptance Criteria:

- Endpoint works without authentication.
- Valid URLs return short codes and short URLs.
- Invalid URLs return item-level errors.
- Created links expire after 2 days.
- Oversized requests are rejected.

---

# Epic 9: Link Management

## TICKET-019: List User Links

Priority: P0  
Estimate: 1 day  
Dependencies: TICKET-011

Description:
Allow logged-in users to list their own links.

Tasks:

- Add `GET /v1/links`.
- Require authentication.
- Support pagination.
- Sort by newest first.

Acceptance Criteria:

- User only sees their own links.
- Anonymous links are not listed.

## TICKET-020: Get Link Details

Priority: P0  
Estimate: 0.5 day  
Dependencies: TICKET-019

Description:
Allow logged-in users to inspect one owned link.

Tasks:

- Add `GET /v1/links/:shortCode`.
- Check ownership.
- Return link details.

Acceptance Criteria:

- Owner can view link details.
- Non-owner cannot view link details.

## TICKET-021: Update, Disable, and Delete Links

Priority: P1  
Estimate: 1.5 days  
Dependencies: TICKET-020, TICKET-015

Description:
Allow users to manage owned links.

Tasks:

- Add `PATCH /v1/links/:shortCode`.
- Add disable behavior.
- Add `DELETE /v1/links/:shortCode`.
- Enforce ownership.
- Invalidate cache.

Acceptance Criteria:

- User can update owned links.
- User can disable owned links.
- User can delete owned links.
- User cannot modify another user's links.

---

# Epic 10: Rate Limiting and Abuse Protection

## TICKET-022: Add Redis Rate Limiting

Priority: P1  
Estimate: 1 day  
Dependencies: TICKET-014

Description:
Add route-level rate limiting using Redis.

Tasks:

- Rate limit authenticated create requests by user ID.
- Rate limit anonymous create requests by IP.
- Rate limit bulk requests by IP.
- Rate limit login failures by IP.
- Rate limit password attempts by IP and short code.

Acceptance Criteria:

- Excess requests return `429 Too Many Requests`.
- Limits are documented in config.
- Rate-limit keys expire automatically.

---

# Epic 11: Kafka Click Events

## TICKET-023: Add Kafka Producer to API

Priority: P0  
Estimate: 1 day  
Dependencies: TICKET-014

Description:
Publish click events during redirects.

Tasks:

- Add Kafka producer.
- Define `click-events` topic.
- Create event schema.
- Include `eventId`, `eventType`, `version`, `shortCode`, `linkId`, `ownerId`, `timestamp`, `userAgent`, `referrer`, `ip`, and `requestId`.
- Do not block redirect if Kafka fails.

Acceptance Criteria:

- Redirect publishes click event.
- Kafka failure is logged.
- Kafka failure does not stop redirect.

---

# Epic 12: Analytics Worker

## TICKET-024: Create Analytics Worker App

Priority: P0  
Estimate: 1 day  
Dependencies: TICKET-003, TICKET-023

Description:
Create Node.js TypeScript Kafka consumer worker.

Tasks:

- Connect to Kafka.
- Join `analytics-consumers` group.
- Consume `click-events`.
- Validate event schema.
- Add structured logging.

Acceptance Criteria:

- Worker starts locally.
- Worker consumes click events.
- Invalid events are logged and skipped safely.

## TICKET-025: Store Click Events in MongoDB

Priority: P0  
Estimate: 1.5 days  
Dependencies: TICKET-024

Description:
Persist analytics events in MongoDB.

Tasks:

- Connect worker to MongoDB.
- Parse user agent.
- Derive browser, OS, device, referrer domain.
- Hash IP.
- Insert into `click_events`.
- Add unique index on `eventId`.

Acceptance Criteria:

- Click event is stored in MongoDB.
- Duplicate event is ignored safely.
- Kafka offset is committed after successful processing.

---

# Epic 13: Analytics API

## TICKET-026: Add Analytics Overview Endpoint

Priority: P0  
Estimate: 1 day  
Dependencies: TICKET-025

Description:
Return analytics summary for an owned link.

Tasks:

- Add `GET /v1/links/:shortCode/analytics`.
- Check ownership.
- Aggregate total clicks.
- Aggregate unique visitors.
- Aggregate clicks today.

Acceptance Criteria:

- Owner can view analytics.
- Non-owner cannot view analytics.
- Endpoint returns correct summary data.

## TICKET-027: Add Analytics Breakdown Endpoints

Priority: P1  
Estimate: 1.5 days  
Dependencies: TICKET-026

Description:
Return time-series and dimension-based analytics.

Tasks:

- Add time-series endpoint.
- Add devices endpoint.
- Add browsers endpoint.
- Add referrers endpoint.
- Add countries endpoint if country enrichment exists.

Acceptance Criteria:

- Dashboard can render charts from these APIs.
- Queries are indexed enough for demo-sized data.

---

# Epic 14: Frontend

## TICKET-029: Create Next.js App Shell

Priority: P0  
Estimate: 1 day  
Dependencies: TICKET-001

Description:
Create the frontend app shell.

Tasks:

- Set up Next.js with TypeScript.
- Add Tailwind CSS.
- Add shadcn/ui.
- Add base layout.
- Add API client helper.

Acceptance Criteria:

- Frontend runs locally.
- Styling system works.
- API base URL is configurable.

## TICKET-030: Build Landing Page with Anonymous Shortening

Priority: P0  
Estimate: 1.5 days  
Dependencies: TICKET-012, TICKET-029

Description:
Build landing page that allows shortening without login.

Tasks:

- Add URL input.
- Add shorten button.
- Show generated short URL.
- Show anonymous expiry notice.
- Handle validation errors.

Acceptance Criteria:

- Anonymous user can create a short URL from the landing page.
- User can copy generated short URL.
- Expiry behavior is clearly communicated.

## TICKET-031: Build Auth Pages

Priority: P0  
Estimate: 1.5 days  
Dependencies: TICKET-009, TICKET-029

Description:
Build login and registration pages.

Tasks:

- Add login page.
- Add register page.
- Store auth tokens securely enough for demo.
- Add logout.

Acceptance Criteria:

- User can register from UI.
- User can login from UI.
- Authenticated API requests work.

## TICKET-032: Build Dashboard Links UI

Priority: P0  
Estimate: 2 days  
Dependencies: TICKET-019, TICKET-021, TICKET-031

Description:
Build dashboard link management UI.

Tasks:

- List links.
- Create authenticated link.
- Copy short URL.
- Disable link.
- Delete link.
- Show status and expiry.

Acceptance Criteria:

- User can manage owned links from dashboard.
- User cannot see anonymous links unless logged-in ownership exists.

## TICKET-033: Build Password-Protected Link UI

Priority: P1  
Estimate: 1 day  
Dependencies: TICKET-017, TICKET-032

Description:
Add UI support for password-protected links.

Tasks:

- Add password field to create-link form.
- Add protected-link indicator.
- Add password challenge page.

Acceptance Criteria:

- User can create protected link from UI.
- Visitor can enter password and redirect.
- Wrong password shows a clear error.

## TICKET-034: Build Bulk Shortening UI or Demo Tool

Priority: P1  
Estimate: 1 day  
Dependencies: TICKET-018, TICKET-029

Description:
Add simple UI or internal demo page for bulk URL shortening.

Tasks:

- Add multiline URL input.
- Submit to bulk endpoint.
- Show per-item result.
- Show validation errors.

Acceptance Criteria:

- Multiple URLs can be shortened from UI.
- Invalid entries do not block valid ones.

## TICKET-035: Build Analytics Dashboard

Priority: P0  
Estimate: 2 days  
Dependencies: TICKET-027, TICKET-032

Description:
Build analytics dashboard with charts.

Tasks:

- Add link analytics page.
- Add KPI cards.
- Add clicks-over-time chart.
- Add browser/device/referrer charts.

Acceptance Criteria:

- User can view analytics for owned links.
- Charts render with API data.

---

# Epic 15: Manual QA

## TICKET-039: Manual End-to-End QA

Priority: P0  
Estimate: 1.5 days  
Dependencies: TICKET-017, TICKET-018, TICKET-035

Description:
Manually verify the full system locally.

Tasks:

- Create link.
- Redirect link.
- Verify Redis cache.
- Verify Kafka event.
- Verify Mongo analytics event.
- Verify dashboard analytics.
- Verify anonymous expiry.
- Verify bulk endpoint.
- Verify password-protected redirect.

Acceptance Criteria:

- Full demo flow works locally.
- Known issues are documented or fixed.

---

# Epic 16: Dockerization

## TICKET-040: Dockerize API and Worker

Priority: P0  
Estimate: 1 day  
Dependencies: TICKET-025

Description:
Create production Docker images for API and analytics worker.

Tasks:

- Add API Dockerfile.
- Add worker Dockerfile.
- Use production npm install strategy.
- Add health checks where appropriate.

Acceptance Criteria:

- API image builds.
- Worker image builds.
- Containers run locally.

## TICKET-041: Dockerize Frontend

Priority: P1  
Estimate: 0.5 day  
Dependencies: TICKET-035

Description:
Add Docker support for frontend if needed outside Amplify.

Tasks:

- Add frontend Dockerfile.
- Configure production build.

Acceptance Criteria:

- Frontend image builds successfully.

---

# Epic 17: Production Deployment

## TICKET-042: Provision Managed Data Services

Priority: P0  
Estimate: 1 day  
Dependencies: TICKET-003

Description:
Create external managed data services.

Tasks:

- Create Aiven PostgreSQL.
- Create Upstash Redis.
- Create Aiven Kafka.
- Create MongoDB Atlas cluster.
- Store connection details securely.

Acceptance Criteria:

- All managed services are reachable.
- Production connection strings are available for deployment.

## TICKET-043: Build and Push Docker Images to ECR

Priority: P0  
Estimate: 1 day  
Dependencies: TICKET-040

Description:
Publish API and worker Docker images.

Tasks:

- Create ECR repositories.
- Build API image.
- Build worker image.
- Push images to ECR.

Acceptance Criteria:

- API image exists in ECR.
- Worker image exists in ECR.

## TICKET-044: Deploy API to ECS Fargate

Priority: P0  
Estimate: 1.5 days  
Dependencies: TICKET-042, TICKET-043

Description:
Deploy the Express API to AWS ECS Fargate.

Tasks:

- Create ECS cluster.
- Create API task definition.
- Configure environment variables from Secrets Manager.
- Create API service.
- Attach service to ALB.

Acceptance Criteria:

- API is reachable through ALB.
- `/health` works in production.
- Logs appear in CloudWatch.

## TICKET-045: Deploy Worker to ECS Fargate

Priority: P0  
Estimate: 1 day  
Dependencies: TICKET-042, TICKET-043

Description:
Deploy analytics worker to ECS Fargate.

Tasks:

- Create worker task definition.
- Configure secrets.
- Create worker service.
- Configure CloudWatch logs.

Acceptance Criteria:

- Worker runs in ECS.
- Worker consumes Kafka events.
- Worker logs appear in CloudWatch.

## TICKET-046: Configure HTTPS, DNS, and Domains

Priority: P0  
Estimate: 1 day  
Dependencies: TICKET-044

Description:
Configure public API and short URL domains.

Tasks:

- Request ACM certificate.
- Configure ALB HTTPS listener.
- Configure Route 53 records.
- Configure API domain.
- Configure short URL domain.

Acceptance Criteria:

- API is available over HTTPS.
- Short URL domain redirects correctly.

## TICKET-047: Deploy Frontend to AWS Amplify

Priority: P0  
Estimate: 1 day  
Dependencies: TICKET-035, TICKET-046

Description:
Deploy the Next.js frontend.

Tasks:

- Connect repository or upload app to Amplify.
- Configure frontend environment variables.
- Configure custom domain if needed.

Acceptance Criteria:

- Frontend is live.
- Frontend can call production API.
- Auth, link creation, redirects, and analytics work from deployed frontend.

---

# Epic 18: Final Demo Readiness

## TICKET-048: Add Project README

Priority: P0  
Estimate: 0.5 day  
Dependencies: TICKET-039

Description:
Document local development and project architecture.

Tasks:

- Add setup instructions.
- Add local commands.
- Add architecture summary.
- Add environment variable list.
- Add demo flow.

Acceptance Criteria:

- A new developer can run the project locally using README instructions.

## TICKET-049: Rehearse End-to-End Demo

Priority: P0  
Estimate: 1 day  
Dependencies: TICKET-047, TICKET-048

Description:
Run final demo rehearsal.

Tasks:

- Register user.
- Login.
- Create authenticated link.
- Create anonymous link.
- Create password-protected link.
- Create bulk links.
- Open redirects.
- Show analytics.
- Show logs.
- Explain architecture decisions.

Acceptance Criteria:

- Demo works without manual database fixes.
- Talking points are clear.
- Known limitations are documented.

---

# Suggested Milestones

## Milestone 1: Local Core Backend

Tickets:

- TICKET-001 to TICKET-014

Outcome:
User registration, login, short URL creation, anonymous creation, redirect, PostgreSQL, and Redis work locally.

Estimated Effort:
8-12 days

## Milestone 2: Analytics Pipeline

Tickets:

- TICKET-023 to TICKET-027

Outcome:
Redirects publish Kafka events, worker stores analytics in MongoDB, and analytics APIs return data.

Estimated Effort:
4-6 days

## Milestone 3: Product Features

Tickets:

- TICKET-013, TICKET-015 to TICKET-018, TICKET-021, TICKET-022

Outcome:
Custom alias, expiration, password-protected URLs, bulk endpoint, management, and rate limiting work.

Estimated Effort:
7-10 days

## Milestone 4: Frontend

Tickets:

- TICKET-029 to TICKET-035

Outcome:
Landing page, auth, dashboard, link management, bulk UI, password UI, and analytics UI work.

Estimated Effort:
8-10 days

## Milestone 5: Manual QA and Deployment

Tickets:

- TICKET-039 to TICKET-049 (excluding retired tickets TICKET-036 to TICKET-038)

Outcome:
Manual QA, Docker images, AWS deployment, project documentation, and final demo are complete.

Estimated Effort:
10-15 days

---

# Recommended Build Order

1. TICKET-001 to TICKET-006
2. TICKET-010
3. TICKET-007 to TICKET-009
4. TICKET-011 and TICKET-012
5. TICKET-014
6. TICKET-023 to TICKET-027
7. TICKET-019 to TICKET-022
8. TICKET-013 and TICKET-015 to TICKET-018
9. TICKET-029 to TICKET-035
10. TICKET-039
11. TICKET-040 to TICKET-047
12. TICKET-048 and TICKET-049
