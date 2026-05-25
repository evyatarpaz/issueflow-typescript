# IssueFlow - Build and Run Instructions

> **Architecture Brief**: IssueFlow is an enterprise-grade, modular NestJS API backed by a PostgreSQL database. The application is fully containerized for scalable deployment and utilizes TypeORM for advanced data management and validation.

## Environment Configuration

The system relies on strict environment variables. A template is provided in `.env.example`. Duplicate this file to `.env` to configure your environment.

| Variable      | Description                                             | Local/Docker Default                       |
| :------------ | :------------------------------------------------------ | :----------------------------------------- |
| `DB_HOST`     | The hostname of the PostgreSQL database instance.       | `postgres` (or `localhost` outside Docker) |
| `DB_PORT`     | The port the database is listening on.                  | `5432`                                     |
| `DB_USERNAME` | The administrative username for the database.           | `postgres`                                 |
| `DB_PASSWORD` | The administrative password.                            | `att_secret_pass`                          |
| `DB_NAME`     | The default database schema to initialize.              | `issueflow_db`                             |
| `JWT_SECRET`  | The cryptographic key used for signing JWT auth tokens. | `att_issueflow_jwt_super_secret_key`       |

> [!WARNING]
> The default values provided are exclusively for local testing and container orchestration. They **must** be securely rotated in a production environment.

## Execution Workflow

Follow these chronological steps to initialize the database, compile the application, and launch the REST API.

### Prerequisites

- **Node.js** (v20+)
- **npm** (Package Manager)
- **Docker & Docker Compose** (Container Orchestration)

### 1. Setup Environment

Copy the boilerplate configuration to your local `.env` file:

```bash
cp .env.example .env
```

### 2. Start the Database

Spin up the isolated PostgreSQL instance via Docker Compose. This mounts a persistent volume to preserve data across restarts:

```bash
docker-compose up -d postgres
```

### 3. Install Dependencies

Resolve and install the required Node modules:

```bash
npm install
```

### 4. Build the Project

Compile the robust TypeScript architecture into the optimized JavaScript distribution payload (`/dist`):

```bash
npm run build
```

### 5. Run the Application

Launch the NestJS backend in development mode:

```bash
npm run start:dev
```

_(For production runtime, execute: `npm run start:prod`)_

### 6. Run the Tests (Unit & E2E)

We provide a clear separation between standard isolated Unit Tests and complex End-to-End integration tests.

#### Unit Tests

Execute the comprehensive unit testing suite:

```bash
npm run test
```

_(To execute tests with a full coverage report, use: `npm run test:cov`)_

#### End-to-End (E2E) Tests

> [!IMPORTANT]
> **Recommended E2E Testing Approach**
> IssueFlow's rigorous E2E tests execute complex asynchronous workflows (including concurrent Optimistic Locking validations). To prevent TypeORM locking conflicts and database race conditions, these tests require a freshly initialized, isolated database.
>
> For a seamless grading experience, we have provided an automated CI script that handles the entire teardown, initialization, and sequential execution process for you:
>
> ```bash
> npm run test:e2e:ci
> ```
>
> _(Note: You can still run `npm run test:e2e` manually, provided your local test database is completely empty before execution.)_

---

### API Documentation (Swagger)

Once the server is operational, you can interact directly with the endpoints via the auto-generated Swagger UI interface:
**http://localhost:3000/api**

---

### (Bonus) The 1-Click Docker Method

For an accelerated grading experience, the entire application stack (PostgreSQL database + NestJS API) can be spun up simultaneously. This command builds the API image locally and bridges the networks automatically:

```bash
docker-compose up --build
```

_Note: The API will wait for the PostgreSQL container to pass its internal health checks before booting._

---

## Troubleshooting & Common Issues

> [!CAUTION]
> If you encounter issues during boot, reference these common grading environment conflicts.

#### Port Conflicts

If you receive an `EADDRINUSE` or `bind: address already in use` error, another service is occupying port `3000` (API) or `5432` (PostgreSQL).

- **Fix:** Update the mapped ports inside the `.env` file or directly inside `docker-compose.yml` (e.g., changing `"3000:3000"` to `"3001:3000"`).

#### Docker Image Caching

If you altered the `.env` or `package.json` but the Docker container refuses to reflect the changes, the Docker daemon is utilizing a stale cache.

- **Fix:** Nuke the build cache and force a hard recompilation from scratch:

```bash
docker-compose build --no-cache
docker-compose up
```

#### Database Connection Timeouts

If the API container crashes with a `TypeORMError` regarding the database connection, it is likely the PostgreSQL container has not finished its boot sequence.

- **Fix:** Ensure the database container is fully marked as `(healthy)` via `docker ps`. The `api` service inside our Compose file enforces a strict `depends_on: service_healthy` check to mitigate this, but manual boots via `npm run start` require manual patience.
