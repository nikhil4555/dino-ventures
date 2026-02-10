# Dino Ventures Internal Wallet Service

This is a robust backend service for an internal wallet system, developed as part of the Dino Ventures Backend Engineer Assignment. It supports Topup, Spend, and Bonus transactions with a full double-entry ledger system.

## 1. How to Spin Up the Database and Run the Seed Script

You can choose between a fully containerized setup or a manual local setup.

### Option A: Fully Containerized (Docker - Recommended)
The Docker setup is configured to automatically initialize the database schema and run the seed script on startup.

1.  **Run the entire stack**:
    ```bash
    docker compose up --build
    ```
    - This spins up a **PostgreSQL 15** container.
    - It waits for the database to be ready using `wait-on`.
    - It automatically executes `npm run db:setup` (which runs `schema.sql` and `seed.sql`).
    - The API starts at `http://localhost:3000`.

### Option B: Local Setup (Manual)
1.  **Prerequisites**: Install Node.js v18+ and PostgreSQL v14+.
2.  **Install Dependencies**: `npm install`
3.  **Environment**: Copy `.env.example` to `.env` and update `DATABASE_URL`.
4.  **Run Seed Script**: 
    ```bash
    npm run db:setup
    ```
    *Note: The script is idempotent. You can run it multiple times safely.*
5.  **Start App**: `npm start`

---

## 2. Choice of Technology and Why

| Technology | Rationale |
| :--- | :--- |
| **Node.js & Express** | Chosen for its non-blocking I/O model which is excellent for handling high-concurrency API requests. The ecosystem provides mature libraries like `pg` for database interaction. |
| **PostgreSQL** | A relational database is essential for financial applications where **ACID compliance** is non-negotiable. Postgres' support for advanced locking and transactions ensures data integrity. |
| **Double-Entry Ledger Architecture** | Instead of just storing a "balance" column, we record every movement as a Debit and Credit. This provides a clear audit trail and makes the system much harder to corrupt. |
| **Docker & Docker Compose** | Ensures the "spin up" process is seamless and the environment is identical across all machines, avoiding "it works on my machine" issues. |

---

## 3. Strategy for Handling Concurrency

The system is designed to prevent race conditions (like double-spending) at multiple levels:

1.  **Atomic Transactions**: All balance updates and ledger entries for a single transaction are wrapped in a database transaction (`BEGIN...COMMIT`). If any step fails, the entire operation is rolled back.
2.  **Pessimistic Locking (`FOR UPDATE`)**: For sensitive operations like `SPEND`, the system locks the user's wallet row during the balance check. This prevents two simultaneous requests from reading the same balance and overdrawing the account.
3.  **Idempotency Protection**: Every transaction requires an `idempotency_key`. The application checks for duplicate keys before processing, ensuring that network retries or accidental double-clicks don't result in duplicate charges.
4.  **Database Constraints**: We use SQL-level `CHECK` constraints (e.g., `balance >= 0`) as a final safety net to ensure invalid states are never persisted.

---

## 4. Project Structure
- `src/app.js`: Application entry point and middleware configuration.
- `src/services/transactionService.js`: Core business logic and transaction orchestration.
- `src/repositories/transactionRepository.js`: Atomic database operations and locking.
- `src/db/schema.sql`: Idempotent database structure.
- `src/db/seed.sql`: Initial data seeding (Accounts, Asset Types).
- `scripts/test-errors.js`: Automated verification of error handling (400, 404, 500).
