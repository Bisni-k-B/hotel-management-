# Hotel Booking Migration System & CDC Demo

An end-to-end Service-Oriented Architecture demonstrating a one-time database migration and a real-time CDC (Change Data Capture) pipeline from PostgreSQL to MongoDB, utilizing Kafka as a message broker.

## Prerequisites
- Node.js (v18+)
- Docker and Docker Compose

## 1. Boot up Infrastructure
Start the Postgres, MongoDB, and KRaft-mode Kafka cluster:
\`\`\`powershell
docker compose up -d
\`\`\`
*Note: Postgres is initialized with hotels, rooms, and schema automatically on boot from `/pg-init`.*

## 2. Install Dependencies
Run the install command from root:
\`\`\`powershell
npm run install:all
\`\`\`

## 3. Run Microservices & UI
You need to open multiple terminal windows to run the following services (from the project root):
- **Booking API (Relational DB Frontend)**: `npm run start:backend` (Runs on Port 3001)
- **CDC Search API (NoSQL Search Frontend)**: `npm run start:search-api` (Runs on Port 3002)
- **React UI**: `npm run start:frontend` (Runs on Port 5173 - `http://localhost:5173`)

## 4. The Demo Flow
### A. The One-Time Migration
Execute the DB-to-DB migration. This script connects to Postgres, transforms the data into nested JSON documents (denormalization), **cleans the MongoDB** collection, and loads the data.
\`\`\`powershell
npm run run:migration
\`\`\`
*Go to the UI -> "Migrated Data Search (Mongo)" and search for anything!*

### B. The Playwright Automation
Generate thousands of bookings spanning 3 years into the future using the Playwright API script:
\`\`\`powershell
npm run run:automation
\`\`\`
*This inserts 2000 bookings directly into the Postgres database.*

### C. The Real-Time CDC Pipeline (Kafka)
Start the CDC services in 2 separate terminals to watch real-time syncing of new bookings from Postgres to MongoDB:
- **Terminal 1**: `npm run start:cdc-publisher` (Polls Postgres outbox and pushes to Kafka)
- **Terminal 2**: `npm run start:cdc-subscriber` (Consumes Kafka, fetches full payload via the Booking API, and saves to MongoDB)

If you run the Automation script *while* the Publisher/Subscriber are running, you will see thousands of events streaming through Kafka into MongoDB in real time!
