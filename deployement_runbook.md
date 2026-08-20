# URL Shortener Deployment Runbook

This runbook converts the attached project plan into a beginner-friendly deployment flow.

Important distinction: the attached document is a project plan/specification. It is not a command script that should be followed blindly. This runbook is the actual step-by-step guide you should use.

Also important: the project currently does not contain the implemented app yet. You should complete the development tickets first, then use this runbook to deploy. Do not deploy before the local end-to-end flow works.

## 1. Final Architecture

Production will look like this:

```text
User
  -> AWS Amplify frontend
  -> HTTPS API domain through AWS Application Load Balancer
  -> ECS Fargate API container
  -> Aiven PostgreSQL
  -> Upstash Redis
  -> Aiven Kafka
  -> ECS Fargate analytics worker container
  -> MongoDB Atlas analytics database
  -> CloudWatch logs
```

Recommended final URLs:

```text
Frontend:  https://app.your-domain.com
API:       https://api.your-domain.com
Short URL: https://go.your-domain.com/abc123
Health:    https://api.your-domain.com/health
Docs:      https://api.your-domain.com/docs
```

Service mapping:

| Local | Production |
|---|---|
| Next.js app | AWS Amplify |
| Node API | ECS Fargate |
| Analytics worker | ECS Fargate |
| Docker images | Amazon ECR |
| PostgreSQL Docker | Aiven PostgreSQL |
| Redis Docker | Upstash Redis |
| Kafka Docker | Aiven Kafka |
| MongoDB Docker | MongoDB Atlas |
| `.env` | AWS Secrets Manager |
| Local logs | CloudWatch |

## 2. Deployment Rule

Do not start cloud deployment until this works locally:

```text
Create URL
  -> redirect
  -> Redis cache
  -> Kafka event
  -> analytics worker
  -> MongoDB event
  -> dashboard analytics
```

If this flow does not work locally, cloud deployment will only make debugging harder.

## 3. Accounts You Need

Create these accounts:

1. AWS account.
2. Aiven account.
3. Upstash account.
4. MongoDB Atlas account.
5. GitHub account.
6. Domain registrar account.

Recommended domain setup:

```text
Use Route 53 for DNS if possible.
Use one root domain, for example your-domain.com.
Use subdomains for app, API, and short links.
```

## 4. Domain Options: Free First, Then Low-Cost

For this project, you want three public hostnames:

```text
app.your-domain.com
api.your-domain.com
go.your-domain.com
```

You have three realistic options.

### Option A: Free Domain If You Are A Student

If you are a verified student, try GitHub Student Developer Pack first.

Current practical path:

```text
GitHub Student Developer Pack
  -> Name.com student offer
  -> free eligible domain for first year
```

Steps:

1. Go to GitHub Education.
2. Apply for GitHub Student Developer Pack using your student email or student proof.
3. After approval, open the GitHub Student Developer Pack offers page.
4. Find the Name.com domain offer.
5. Click through from GitHub to Name.com.
6. Search for an available domain.
7. Choose an eligible free TLD.
8. Complete checkout.
9. Keep auto-renew disabled if you do not want to be charged next year.

Eligible TLDs can change, but examples may include:

```text
.codes
.systems
.studio
.software
.engineer
.live
.app
.dev
.page
```

Example good project domains:

```text
prathamshort.dev
shortlinkdemo.dev
urlkit.page
linkpilot.codes
```

Important:

```text
The first year may be free.
Renewal is usually paid.
You may still need a payment method on file.
Use real contact details because domain registration requires valid registrant information.
```

### Option B: No Free Student Domain

If you are not eligible for a student offer, use a low-cost domain.

Beginner-friendly registrars:

```text
Cloudflare Registrar
Namecheap
Name.com
AWS Route 53 Domains
```

Recommended for lowest ongoing cost:

```text
Cloudflare Registrar
```

Recommended for simplest AWS-only setup:

```text
AWS Route 53 Domains
```

Tradeoff:

```text
Cloudflare Registrar is often cost-effective, but uses Cloudflare nameservers.
Route 53 is convenient with AWS, but domain registration and hosted zones are paid.
AWS credits generally do not cover Route 53 domain registration.
```

If you buy through Route 53:

1. Open AWS Console.
2. Search for Route 53.
3. Open Registered domains.
4. Choose Register domain.
5. Search for a domain.
6. Pick a non-premium domain.
7. Enter contact details.
8. Enable privacy protection if supported.
9. Review price carefully.
10. Complete registration.

Beginner warning:

```text
Domain registrations are usually not refundable.
Double-check spelling before buying.
```

### Option C: No Custom Domain For Early Testing

If you do not want to buy a domain yet, you can still test deployment using provider URLs:

```text
Frontend: Amplify generated domain
API:      ALB generated DNS name
Short URL: ALB generated DNS name
```

Example:

```text
https://main.abc123.amplifyapp.com
http://url-shortener-alb-123456.us-east-1.elb.amazonaws.com
```

This is acceptable for early testing, but not ideal for the final demo because the short URL looks messy.

For the final interview/demo, use a real domain if possible.

## 5. Tools To Install Locally

Install these:

```bash
node --version
npm --version
docker --version
docker compose version
aws --version
git --version
```

Expected:

```text
Node.js: 20 or 22
npm: available
Docker: available
Docker Compose: available
AWS CLI: available
Git: available
```

Configure AWS CLI:

```bash
aws configure
```

You will enter:

```text
AWS Access Key ID
AWS Secret Access Key
Default region, for example us-east-1
Default output format: json
```

Check AWS identity:

```bash
aws sts get-caller-identity
```

## 6. Local Infrastructure Setup

Create a `docker-compose.yml` file later when you are ready to run local infrastructure. Use this content:

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
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U shortener -d shortener"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: shortener-redis
    command: redis-server --appendonly yes
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  mongodb:
    image: mongo:8
    container_name: shortener-mongodb
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    healthcheck:
      test:
        [
          "CMD",
          "mongosh",
          "--quiet",
          "--eval",
          "db.adminCommand('ping').ok"
        ]
      interval: 10s
      timeout: 5s
      retries: 5

  kafka:
    image: bitnami/kafka:3.7
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
      KAFKA_CFG_LISTENER_SECURITY_PROTOCOL_MAP: CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT
      KAFKA_CFG_AUTO_CREATE_TOPICS_ENABLE: "true"
      ALLOW_PLAINTEXT_LISTENER: "yes"
    volumes:
      - kafka_data:/bitnami/kafka
    healthcheck:
      test:
        [
          "CMD-SHELL",
          "/opt/bitnami/kafka/bin/kafka-topics.sh --bootstrap-server localhost:9092 --list >/dev/null 2>&1"
        ]
      interval: 15s
      timeout: 10s
      retries: 10

  kafka-ui:
    image: provectuslabs/kafka-ui:latest
    container_name: shortener-kafka-ui
    depends_on:
      kafka:
        condition: service_healthy
    ports:
      - "8080:8080"
    environment:
      KAFKA_CLUSTERS_0_NAME: local
      KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS: kafka:9092

volumes:
  postgres_data:
  redis_data:
  mongo_data:
  kafka_data:
```

Start local infrastructure:

```bash
docker compose up -d
docker compose ps
```

Expected ports:

```text
PostgreSQL: localhost:5432
Redis:      localhost:6379
Kafka:      localhost:9092
MongoDB:    localhost:27017
Kafka UI:   http://localhost:8080
```

## 7. Local Environment Variables

Create `.env.example` later with this content:

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
KAFKA_USERNAME=
KAFKA_PASSWORD=

MONGO_URI=mongodb://localhost:27017/url_shortener_analytics

JWT_ACCESS_SECRET=replace-with-local-access-secret
JWT_REFRESH_SECRET=replace-with-local-refresh-secret
IP_HASH_SECRET=replace-with-local-ip-hash-secret

BASE62_ALPHABET=abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789

NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SHORT_URL=http://localhost:4000
```

Create your real local env file:

```bash
cp .env.example .env
```

Never commit the real `.env`.

## 8. Local App Startup

Once the monorepo and apps are implemented, run:

```bash
npm install
npm run db:migrate
npm run kafka:create-topics
npm run dev
```

Expected local URLs:

```text
Frontend: http://localhost:3000
API:      http://localhost:4000
Health:   http://localhost:4000/health
Docs:     http://localhost:4000/docs
```

Minimum local success checklist:

1. `GET /health` returns OK.
2. User registration works.
3. Login works.
4. Authenticated URL creation works.
5. Anonymous URL creation works.
6. Anonymous URL expires after 2 days.
7. Short URL redirects with `302`.
8. Unknown code returns `404`.
9. Expired or disabled code returns `410`.
10. Redis cache hit and miss both work.
11. Kafka event is produced on redirect.
12. Kafka failure does not block redirect.
13. Worker consumes Kafka events.
14. MongoDB stores analytics events.
15. Dashboard displays analytics.
16. Password-protected URLs work.
17. Bulk URL shortening works.
18. Rate limiting works.

## 9. Production Managed Services

### 8.1 Aiven PostgreSQL

Create one PostgreSQL service.

Recommended:

```text
Service name: url-shortener-postgres
Database:     url_shortener
```

Copy the connection string:

```env
DATABASE_URL=postgresql://...
```

Production notes:

```text
Use SSL.
Do not put the URL in code.
Store it in AWS Secrets Manager.
Run migrations against this database before starting the production API.
```

### 8.2 Upstash Redis

Create one Redis database.

Copy:

```env
REDIS_URL=rediss://...
```

Production notes:

```text
Use TLS URL, usually rediss://.
Use it for URL cache and rate limiting.
Do not expose credentials in Git.
```

### 8.3 Aiven Kafka

Create one Kafka service.

Create topic:

```text
click-events
```

Recommended:

```text
Partitions: 3
Consumer group: analytics-consumers
```

Copy:

```env
KAFKA_BROKERS=...
KAFKA_USERNAME=...
KAFKA_PASSWORD=...
KAFKA_CLICK_TOPIC=click-events
KAFKA_ANALYTICS_GROUP=analytics-consumers
```

Production notes:

```text
The API produces click events.
The worker consumes click events.
Kafka failure must not stop redirects.
```

### 8.4 MongoDB Atlas

Create one MongoDB Atlas cluster.

Create:

```text
Database:   url_shortener_analytics
Collection: click_events
```

Create indexes:

```javascript
db.click_events.createIndex({ eventId: 1 }, { unique: true });
db.click_events.createIndex({ shortCode: 1, timestamp: -1 });
db.click_events.createIndex({ ownerId: 1, timestamp: -1 });
```

Copy:

```env
MONGO_URI=mongodb+srv://...
```

Production notes:

```text
Restrict network access as much as practical.
Never store raw passwords or JWTs.
Avoid storing raw IP addresses; store hashed IPs instead.
```

## 10. AWS Secrets Manager

Create one production secret:

```bash
aws secretsmanager create-secret \
  --name url-shortener/production \
  --secret-string '{
    "DATABASE_URL":"replace-me",
    "REDIS_URL":"replace-me",
    "KAFKA_BROKERS":"replace-me",
    "KAFKA_USERNAME":"replace-me",
    "KAFKA_PASSWORD":"replace-me",
    "MONGO_URI":"replace-me",
    "JWT_ACCESS_SECRET":"replace-me",
    "JWT_REFRESH_SECRET":"replace-me",
    "BASE62_ALPHABET":"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
    "IP_HASH_SECRET":"replace-me"
  }'
```

Generate strong secrets:

```bash
openssl rand -base64 48
```

Use this for:

```text
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
IP_HASH_SECRET
```

Important:

```text
Do not rotate BASE62_ALPHABET casually.
Existing short URLs depend on this alphabet.
Changing it can break old links.
```

## 11. Dockerfiles

When the app exists, create API and worker Dockerfiles. The following examples assume:

```text
apps/api/dist/server.js
apps/analytics-worker/dist/consumer.js
npm workspaces
```

API Dockerfile:

```dockerfile
FROM node:22-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package*.json ./
COPY apps/api/package*.json apps/api/
COPY apps/analytics-worker/package*.json apps/analytics-worker/
COPY apps/web/package*.json apps/web/
COPY packages/shared/package*.json packages/shared/
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run build --workspace apps/api

FROM base AS runtime
ENV NODE_ENV=production
COPY package*.json ./
COPY apps/api/package*.json apps/api/
COPY packages/shared/package*.json packages/shared/
RUN npm ci --omit=dev --workspace apps/api --workspace packages/shared
COPY --from=build /app/apps/api/dist apps/api/dist
EXPOSE 4000
CMD ["node", "apps/api/dist/server.js"]
```

Worker Dockerfile:

```dockerfile
FROM node:22-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package*.json ./
COPY apps/api/package*.json apps/api/
COPY apps/analytics-worker/package*.json apps/analytics-worker/
COPY apps/web/package*.json apps/web/
COPY packages/shared/package*.json packages/shared/
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run build --workspace apps/analytics-worker

FROM base AS runtime
ENV NODE_ENV=production
COPY package*.json ./
COPY apps/analytics-worker/package*.json apps/analytics-worker/
COPY packages/shared/package*.json packages/shared/
RUN npm ci --omit=dev --workspace apps/analytics-worker --workspace packages/shared
COPY --from=build /app/apps/analytics-worker/dist apps/analytics-worker/dist
CMD ["node", "apps/analytics-worker/dist/consumer.js"]
```

## 12. Amazon ECR

Create repositories:

```bash
aws ecr create-repository --repository-name url-shortener-api
aws ecr create-repository --repository-name url-shortener-worker
```

Get AWS account ID:

```bash
aws sts get-caller-identity --query Account --output text
```

Login to ECR:

```bash
aws ecr get-login-password --region us-east-1 \
  | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
```

Build and push API:

```bash
docker build -f infra/docker/api.Dockerfile -t url-shortener-api .
docker tag url-shortener-api:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/url-shortener-api:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/url-shortener-api:latest
```

Build and push worker:

```bash
docker build -f infra/docker/worker.Dockerfile -t url-shortener-worker .
docker tag url-shortener-worker:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/url-shortener-worker:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/url-shortener-worker:latest
```

Beginner note:

```text
latest is okay for early testing.
For real deployments, use a Git commit SHA tag.
```

Example:

```bash
docker tag url-shortener-api:latest <ecr-url>:git-abc1234
docker push <ecr-url>:git-abc1234
```

## 13. ECS Infrastructure

Create one ECS cluster:

```bash
aws ecs create-cluster --cluster-name url-shortener-cluster
```

You need these AWS resources:

```text
VPC
Public subnets for load balancer
Private subnets for ECS tasks, if possible
Application Load Balancer
Target group for API
Security group for ALB
Security group for API tasks
Security group for worker tasks
IAM task execution role
IAM task role
CloudWatch log groups
ECS API service
ECS worker service
```

Beginner recommendation:

```text
Use AWS Console the first time.
Terraform is useful later, but the console helps you understand how the pieces connect.
```

## 14. CloudWatch Logs

Create log groups:

```bash
aws logs create-log-group --log-group-name /ecs/url-shortener-api
aws logs create-log-group --log-group-name /ecs/url-shortener-worker
```

The API should log:

```text
requestId
method
path
statusCode
responseTimeMs
shortCode when relevant
cache HIT or MISS
Kafka publish failures
```

The worker should log:

```text
consumer group
topic
eventId
shortCode
Mongo insert success
duplicate event ignored
processing failures
```

## 15. API ECS Task Definition

Use this as your API task definition template:

```json
{
  "family": "url-shortener-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "<execution-role-arn>",
  "taskRoleArn": "<task-role-arn>",
  "containerDefinitions": [
    {
      "name": "api",
      "image": "<api-image-uri>",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 4000,
          "hostPort": 4000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        { "name": "NODE_ENV", "value": "production" },
        { "name": "API_PORT", "value": "4000" },
        { "name": "WEB_URL", "value": "https://app.your-domain.com" },
        { "name": "PUBLIC_SHORT_BASE_URL", "value": "https://go.your-domain.com" },
        { "name": "KAFKA_CLIENT_ID", "value": "url-shortener-api" },
        { "name": "KAFKA_CLICK_TOPIC", "value": "click-events" },
        { "name": "KAFKA_ANALYTICS_GROUP", "value": "analytics-consumers" }
      ],
      "secrets": [
        { "name": "DATABASE_URL", "valueFrom": "<secret-arn>:DATABASE_URL::" },
        { "name": "REDIS_URL", "valueFrom": "<secret-arn>:REDIS_URL::" },
        { "name": "KAFKA_BROKERS", "valueFrom": "<secret-arn>:KAFKA_BROKERS::" },
        { "name": "KAFKA_USERNAME", "valueFrom": "<secret-arn>:KAFKA_USERNAME::" },
        { "name": "KAFKA_PASSWORD", "valueFrom": "<secret-arn>:KAFKA_PASSWORD::" },
        { "name": "MONGO_URI", "valueFrom": "<secret-arn>:MONGO_URI::" },
        { "name": "JWT_ACCESS_SECRET", "valueFrom": "<secret-arn>:JWT_ACCESS_SECRET::" },
        { "name": "JWT_REFRESH_SECRET", "valueFrom": "<secret-arn>:JWT_REFRESH_SECRET::" },
        { "name": "BASE62_ALPHABET", "valueFrom": "<secret-arn>:BASE62_ALPHABET::" },
        { "name": "IP_HASH_SECRET", "valueFrom": "<secret-arn>:IP_HASH_SECRET::" }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/url-shortener-api",
          "awslogs-region": "<region>",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "wget -qO- http://localhost:4000/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 30
      }
    }
  ]
}
```

Replace:

```text
<execution-role-arn>
<task-role-arn>
<api-image-uri>
<secret-arn>
<region>
your-domain.com
```

Register it:

```bash
aws ecs register-task-definition --cli-input-json file://api-task-definition.json
```

## 16. Worker ECS Task Definition

Use this as your worker task definition template:

```json
{
  "family": "url-shortener-worker",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "<execution-role-arn>",
  "taskRoleArn": "<task-role-arn>",
  "containerDefinitions": [
    {
      "name": "worker",
      "image": "<worker-image-uri>",
      "essential": true,
      "environment": [
        { "name": "NODE_ENV", "value": "production" },
        { "name": "KAFKA_CLIENT_ID", "value": "url-shortener-worker" },
        { "name": "KAFKA_CLICK_TOPIC", "value": "click-events" },
        { "name": "KAFKA_ANALYTICS_GROUP", "value": "analytics-consumers" }
      ],
      "secrets": [
        { "name": "KAFKA_BROKERS", "valueFrom": "<secret-arn>:KAFKA_BROKERS::" },
        { "name": "KAFKA_USERNAME", "valueFrom": "<secret-arn>:KAFKA_USERNAME::" },
        { "name": "KAFKA_PASSWORD", "valueFrom": "<secret-arn>:KAFKA_PASSWORD::" },
        { "name": "MONGO_URI", "valueFrom": "<secret-arn>:MONGO_URI::" },
        { "name": "IP_HASH_SECRET", "valueFrom": "<secret-arn>:IP_HASH_SECRET::" }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/url-shortener-worker",
          "awslogs-region": "<region>",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

Replace placeholders and register:

```bash
aws ecs register-task-definition --cli-input-json file://worker-task-definition.json
```

## 17. Application Load Balancer

Create an ALB for the API.

Recommended settings:

```text
Name: url-shortener-alb
Scheme: internet-facing
Listener HTTP: 80
Listener HTTPS: 443 after ACM is ready
Target group name: url-shortener-api-tg
Target group protocol: HTTP
Target group port: 4000
Health check path: /health
```

Security groups:

```text
ALB security group:
  Inbound 80 from 0.0.0.0/0
  Inbound 443 from 0.0.0.0/0
  Outbound to API security group on 4000

API task security group:
  Inbound 4000 from ALB security group
  Outbound HTTPS 443 to internet

Worker task security group:
  No inbound required
  Outbound HTTPS 443 to internet
```

Why outbound HTTPS:

```text
API and worker must reach Aiven, Upstash, MongoDB Atlas, and AWS Secrets Manager.
```

## 18. ECS API Service

Create ECS service:

```text
Cluster: url-shortener-cluster
Launch type: Fargate
Service name: url-shortener-api-service
Task definition: url-shortener-api
Desired tasks: 1
Load balancer: yes
Target group: url-shortener-api-tg
Container: api
Container port: 4000
```

Verify with the ALB DNS name:

```bash
curl http://<alb-dns-name>/health
```

Expected:

```json
{"status":"ok"}
```

If this fails:

```text
Check ECS task logs in CloudWatch.
Check task stopped reason.
Check target group health.
Check security group inbound rules.
Check API_PORT.
Check required secrets.
```

## 19. ECS Worker Service

Create ECS service:

```text
Cluster: url-shortener-cluster
Launch type: Fargate
Service name: url-shortener-worker-service
Task definition: url-shortener-worker
Desired tasks: 1
Load balancer: no
Public port: none
```

Verify:

```text
Open CloudWatch log group /ecs/url-shortener-worker.
Confirm the worker starts.
Confirm it connects to Kafka.
Confirm it joins analytics-consumers.
```

## 20. DNS, Route 53, And ACM HTTPS

Use these domains:

```text
app.your-domain.com -> AWS Amplify
api.your-domain.com -> ALB
go.your-domain.com  -> ALB
```

### If Your Domain Is Registered In Route 53

Route 53 usually creates the hosted zone for you.

Check:

1. Open Route 53.
2. Open Hosted zones.
3. Confirm your domain exists.
4. Open the hosted zone.
5. You should see NS and SOA records.

### If Your Domain Is Registered Somewhere Else

You can still use Route 53 for DNS.

Steps:

1. Open AWS Route 53.
2. Go to Hosted zones.
3. Create hosted zone.
4. Enter your root domain, for example `your-domain.com`.
5. Choose Public hosted zone.
6. Route 53 will create NS records.
7. Copy the Route 53 nameservers.
8. Go to your domain registrar.
9. Replace the domain's nameservers with the Route 53 nameservers.
10. Wait for DNS propagation.

Check nameservers:

```bash
dig NS your-domain.com
```

Expected:

```text
The result should show AWS Route 53 nameservers if you moved DNS to Route 53.
```

### If You Use Cloudflare DNS Instead

You can keep DNS in Cloudflare and still point to AWS.

Use:

```text
api.your-domain.com CNAME -> ALB DNS name
go.your-domain.com  CNAME -> ALB DNS name
app.your-domain.com CNAME -> Amplify domain target
```

For ALB records in Cloudflare:

```text
DNS only is the simplest starting mode.
Avoid proxying through Cloudflare until HTTPS and health checks are working.
```

Request ACM certificate:

```text
Certificate: *.your-domain.com
Validation: DNS
Region: same region as ALB
```

After ACM status becomes `Issued`:

```text
Add HTTPS listener 443 to ALB.
Attach ACM certificate.
Forward HTTPS traffic to API target group.
Change HTTP listener 80 to redirect to HTTPS 443.
```

Route 53 records:

```text
api.your-domain.com A/AAAA alias -> ALB
go.your-domain.com  A/AAAA alias -> ALB
```

Verify:

```bash
curl https://api.your-domain.com/health
```

Expected:

```json
{"status":"ok"}
```

## 21. AWS Amplify Frontend

Push the code to GitHub.

In AWS Amplify:

```text
New app
Host web app
Choose GitHub
Select repository
Select branch
App root: apps/web
```

Set environment variables:

```env
NEXT_PUBLIC_API_URL=https://api.your-domain.com
NEXT_PUBLIC_SHORT_URL=https://go.your-domain.com
```

Build settings depend on your Next.js setup, but usually:

```bash
npm install
npm run build --workspace apps/web
```

Connect custom domain:

```text
app.your-domain.com
```

Verify:

```text
Open https://app.your-domain.com
Create URL from frontend
Confirm frontend calls https://api.your-domain.com
Confirm generated short URL uses https://go.your-domain.com
```

## 22. Production Deployment Order

Follow this exact order:

1. Finish local core app.
2. Run full local end-to-end test.
3. Get a domain using the student/free path if eligible.
4. If no free domain is available, buy a low-cost domain or use generated provider URLs temporarily.
5. Decide where DNS will live: Route 53 or Cloudflare.
6. Create Aiven PostgreSQL.
7. Create Upstash Redis.
8. Create Aiven Kafka and `click-events` topic.
9. Create MongoDB Atlas cluster and indexes.
10. Create AWS Secrets Manager secret.
11. Create ECR repositories.
12. Build API Docker image.
13. Push API image to ECR.
14. Build worker Docker image.
15. Push worker image to ECR.
16. Create ECS cluster.
17. Create CloudWatch log groups.
18. Create or select VPC/subnets.
19. Create ALB security group.
20. Create ECS task security groups.
21. Create ALB.
22. Create API target group.
23. Register API task definition.
24. Create API ECS service.
25. Test API through ALB HTTP.
26. Register worker task definition.
27. Create worker ECS service.
28. Confirm worker logs.
29. Request ACM certificate.
30. Add DNS validation records.
31. Wait for ACM certificate to become `Issued`.
32. Add HTTPS listener to ALB.
33. Redirect HTTP to HTTPS.
34. Create `api.your-domain.com` DNS record.
35. Create `go.your-domain.com` DNS record.
36. Test API over HTTPS.
37. Deploy frontend to Amplify.
38. Add `app.your-domain.com` to Amplify.
39. Run production end-to-end test.

## 23. Production Verification Checklist

Run this after every deployment:

1. `https://api.your-domain.com/health` returns OK.
2. `https://api.your-domain.com/docs` loads.
3. User can register.
4. User can login.
5. User can create authenticated short URL.
6. Anonymous user can create short URL.
7. Anonymous link has 2-day expiry.
8. Bulk endpoint works.
9. Password-protected link blocks direct redirect.
10. Wrong password fails.
11. Correct password redirects.
12. Short URL redirects with `302`.
13. Unknown short code returns `404`.
14. Expired short code returns `410`.
15. Disabled short code returns `410`.
16. Redis cache hit works.
17. Redis cache miss falls back to PostgreSQL.
18. Kafka event is published on redirect.
19. Worker consumes Kafka event.
20. MongoDB stores analytics event.
21. Duplicate Kafka event does not create duplicate analytics.
22. Dashboard shows analytics.
23. API logs appear in CloudWatch.
24. Worker logs appear in CloudWatch.
25. ECS API service has stable running tasks.
26. ECS worker service has stable running tasks.

## 24. Beginner Debugging Guide

### Frontend Cannot Call API

Check:

```text
NEXT_PUBLIC_API_URL
Browser console errors
API CORS config
WEB_URL in API environment
ALB security group
API ECS service health
CloudWatch API logs
```

### API Task Keeps Restarting

Check:

```text
CloudWatch logs
ECS stopped reason
Missing Secrets Manager values
Wrong secret ARN
Database SSL requirement
API_PORT=4000
Health endpoint exists
Docker CMD path is correct
```

### ALB Shows Unhealthy Targets

Check:

```text
Target group health check path is /health
Target group port is 4000
API listens on 0.0.0.0, not only localhost
API security group allows inbound 4000 from ALB security group
Container port mapping is 4000
```

### Redirect Works But Analytics Do Not

Check:

```text
Kafka topic click-events exists
KAFKA_BROKERS is correct
KAFKA_USERNAME and KAFKA_PASSWORD are correct
API logs show event publish success or failure
Worker logs show Kafka connection
Worker logs show MongoDB insert
MongoDB Atlas network access allows connection
```

### MongoDB Duplicate Errors

This is expected only when the same `eventId` is processed again.

Correct behavior:

```text
Duplicate eventId is ignored safely.
Worker does not crash forever.
Kafka offset handling remains correct.
```

### DNS Does Not Work

Check:

```text
Route 53 hosted zone is correct
Nameservers at registrar point to Route 53
ACM DNS validation record exists
api.your-domain.com points to ALB alias
go.your-domain.com points to ALB alias
DNS propagation may take time
```

### HTTPS Does Not Work

Check:

```text
ACM certificate status is Issued
Certificate is in same region as ALB
ALB has HTTPS listener on 443
ALB security group allows inbound 443
Route 53 alias points to correct ALB
```

## 25. Security Checklist

Before production demo:

1. No `.env` committed.
2. Real secrets are only in AWS Secrets Manager or provider dashboards.
3. Passwords are hashed with Argon2id or bcrypt.
4. Refresh tokens are stored only as hashes.
5. JWT access tokens expire quickly.
6. URL input is validated.
7. Custom aliases are validated.
8. SQL queries are parameterized.
9. Users can modify only their own links.
10. CORS allows only the frontend domain.
11. Rate limiting is enabled.
12. Link password attempts are rate limited.
13. Raw IP addresses are not stored unnecessarily.
14. Logs do not contain passwords, tokens, or full secrets.
15. HTTPS is enabled.

## 26. Interview Demo Flow

Use this sequence:

1. Open `https://app.your-domain.com`.
2. Register a new user.
3. Login.
4. Create a short URL.
5. Explain Base62 short code generation.
6. Copy the generated short URL.
7. Open the short URL.
8. Show successful redirect.
9. Show CloudWatch API log with request ID.
10. Explain Redis cache-aside.
11. Open the same short URL again.
12. Show cache hit in logs.
13. Explain Kafka event publishing.
14. Show worker log consuming event.
15. Show analytics dashboard count increased.
16. Create anonymous link.
17. Explain 2-day expiry.
18. Create password-protected link.
19. Show wrong password failure.
20. Show correct password redirect.
21. Show bulk shortening endpoint or UI.
22. Explain how API and worker scale independently.

## 27. Architecture Talking Points

Why PostgreSQL:

```text
Users and links are relational.
Unique constraints matter for email and short_code.
Foreign keys are useful.
Base62 works naturally from numeric identity IDs.
```

Why Redis:

```text
URL shorteners are read-heavy.
Popular links get repeated traffic.
Redis reduces PostgreSQL load.
Redis also supports rate limiting.
```

Why Kafka:

```text
Analytics should not slow down redirects.
Kafka decouples redirect handling from analytics processing.
Events can be replayed.
Workers can scale horizontally with consumer groups.
```

Why MongoDB:

```text
Click events are document-shaped.
Analytics schema can evolve.
MongoDB aggregation is convenient for dashboard breakdowns.
Analytics data is separated from PostgreSQL transactional data.
```

Why `302` redirect:

```text
302 is temporary.
Browsers and proxies are less likely to permanently cache it.
This keeps future clicks flowing through the backend so analytics remain accurate.
```

Why separate API and worker:

```text
The API handles user-facing requests and redirects.
The worker handles slower analytics processing.
Each can scale independently.
Analytics failure should not break redirects.
```

## 28. What Not To Add Yet

Do not add these until the core system works:

```text
Grafana
OpenTelemetry
Multi-region deployment
Complex CI/CD
Terraform for every resource
Dead-letter queues
Advanced autoscaling
```

Add them later after the deployed end-to-end flow is stable.

## 29. Final Definition Of Done

The project is production-demo ready when:

1. User can register.
2. User can login.
3. User can create a short URL.
4. Anonymous user can create a short URL without login.
5. Anonymous short URL expires after 2 days.
6. Public bulk endpoint returns short codes for multiple URLs.
7. Password-protected URL blocks redirect until correct password is entered.
8. Short code is generated using Base62.
9. Redirect works.
10. Redis caches resolved URLs.
11. Cache miss falls back to PostgreSQL.
12. Redirect publishes Kafka event.
13. Worker consumes Kafka event.
14. MongoDB stores click analytics.
15. Dashboard displays analytics.
16. Rate limiting works.
17. Swagger/OpenAPI docs are available.
18. Structured logs contain request IDs.
19. Local Docker Compose infrastructure works.
20. Backend API is deployed on ECS Fargate.
21. Worker is deployed on ECS Fargate.
22. Frontend is deployed on Amplify.
23. PostgreSQL runs on Aiven.
24. Redis runs on Upstash.
25. Kafka runs on Aiven.
26. Analytics database runs on MongoDB Atlas.
27. API is accessible through HTTPS.
28. Short URL domain works.
29. CloudWatch contains API and worker logs.
30. Full demo has been rehearsed end to end.
