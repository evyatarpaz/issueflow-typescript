# IssueFlow Backend: Project Roadmap & Execution Plan

## 1. Project Overview & Scope
* The objective is to build a RESTful backend API for IssueFlow, a lightweight project and issue tracking platform. 
* The system manages users, projects, tickets (issues), and comments. 
* Extended features include audit logging, ticket dependencies, file attachments, CSV import/export, soft deletion, comment mentions, auto-escalation, and auto-assignment.

## 2. Architecture & Tech Stack
* **Language/Framework:** TypeScript 5.x with NestJS 11.
* **Database:** PostgreSQL spun up via the provided `compose.yml`.
* **ORM:** TypeORM (NestJS standard, highly recommended for PostgreSQL integration).
* **Testing:** Jest for unit testing and Supertest for End-to-End (e2e) testing.
* **Documentation & Interactive Testing:** Swagger (OpenAPI) with JWT Bearer Authentication.

## 3. Git Workflow & Testing Strategy
* **Branching Strategy (Feature Branch Workflow):** Never commit directly to `main`. 
* Create a new branch for every task using the format `type/scope`. 
* Examples: `feature/user-registration`, `bugfix/ticket-status-update`, `test/auth-service`.
* **Commit Conventions (Conventional Commits):** Group logic into atomic commits.
* Use `feat: <description>`, `fix: <description>`, `test: <description>`, `refactor: <description>`.
* **Unit Testing Policy:** Every feature branch MUST include comprehensive unit tests before being merged. No tests means the code is not done. 

## 4. Core Database Schema (Entity Reference)
*Keep this reference handy when building your TypeORM entities.*

* **User:** `id`, `username`, `email`, `password`, `fullName`, `role` (ADMIN/DEVELOPER), `createdAt`, `updatedAt`
* **Project:** `id`, `name`, `description`, `ownerId`, `isDeleted`, `deletedAt`, `createdAt`, `updatedAt`
* **Ticket:** `id`, `title`, `description`, `status` (TODO/IN_PROGRESS/IN_REVIEW/DONE), `priority` (LOW/MEDIUM/HIGH/CRITICAL), `type` (BUG/FEATURE/TECHNICAL), `projectId`, `assigneeId`, `dueDate`, `isOverdue`, `isDeleted`, `version` (Optimistic Locking), `createdAt`, `updatedAt`
* **Comment:** `id`, `content`, `ticketId`, `authorId`, `version` (Optimistic Locking), `createdAt`, `updatedAt`

## 5. Granular Feature Breakdown (The Roadmap)

### Milestone 1: Infrastructure, Database & Documentation Setup
- [ ] **Task:** Initialize TypeORM and connect to the PostgreSQL Docker instance. Install and configure Swagger (OpenAPI) with Bearer Authentication in `main.ts`. Set up Global Validation Pipes and Exception Filters.
- [ ] **Branch:** `chore/infrastructure-setup`
- [ ] **Commit:** `feat: integrate TypeORM, global pipes, and swagger documentation`
- [ ] **Test Requirement:** Write a simple e2e test verifying the application bootstraps, the database connection is established without throwing errors, and the `/api` Swagger UI endpoint returns a 200 status code.

### Milestone 2: User Management & Authentication
- [ ] **Task:** Implement User entity and CRUD operations.
- [ ] **Endpoints:** `GET /users`, `GET /users/:userId`, `POST /users`, `POST /users/update/:userId`, `DELETE /users/:userId`
- [ ] **Branch:** `feature/user-management`
- [ ] **Commit:** `feat: add user registration and fetch endpoints`
- [ ] **Test Requirement:** Mock the user repository. Test successful registration, ensure invalid roles are rejected, and test fetching users by ID. Document endpoints using Swagger decorators (`@ApiProperty`, `@ApiResponse`).
- [ ] **Task:** Implement JWT Authentication with bcrypt hashing.
- [ ] **Endpoints:** `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`
- [ ] **Branch:** `feature/jwt-auth`
- [ ] **Test Requirement:** Test that valid credentials return a signed JWT, invalid credentials return 401, and protected routes block unauthenticated requests. Secure the Swagger documentation endpoints via `@ApiBearerAuth()`.

### Milestone 3: Core Entities (Projects, Tickets, Comments)
- [ ] **Task:** Implement Project CRUD and Soft Delete functionality.
- [ ] **Endpoints:** `GET /projects`, `POST /projects`, `PATCH /projects/:projectId`, `DELETE /projects/:projectId`, `POST /projects/:projectId/restore`
- [ ] **Branch:** `feature/project-crud`
- [ ] **Test Requirement:** Validate that a project cannot be created without an ownerId. Test successful retrieval and updates. Document all query params and payload structures in Swagger.
- [ ] **Task:** Implement Ticket CRUD operations with strict status transitions and Optimistic Locking (`@VersionColumn`).
- [ ] **Endpoints:** `GET /tickets?projectId=:projectId`, `POST /tickets`, `PATCH /tickets/:ticketId`, `DELETE /tickets/:ticketId`
- [ ] **Branch:** `feature/ticket-crud`
- [ ] **Test Requirement:** Write unit tests to explicitly enforce that backward transitions are rejected, a DONE ticket cannot be updated, and concurrent updates fail gracefully with version checking.
- [ ] **Task:** Implement Comment CRUD.
- [ ] **Endpoints:** `GET /tickets/:ticketId/comments`, `POST /tickets/:ticketId/comments`, `PATCH /comments/:commentId`
- [ ] **Branch:** `feature/comment-crud`
- [ ] **Test Requirement:** Mock concurrent edit attempts to ensure proper locking/validation logic rejects the second request.

### Milestone 4: Extended Business Logic
- [ ] **Task:** Implement a persistent, append-only Audit Log for state-changing actions.
- [ ] **Endpoints:** `GET /audit-logs?entityType=&entityId=`
- [ ] **Branch:** `feature/audit-logging`
- [ ] **Test Requirement:** Create a ticket via the service and verify an audit log record is automatically generated with the correct actor and action payload.
- [ ] **Task:** Implement Ticket Dependencies (Blockers).
- [ ] **Endpoints:** `POST /tickets/:ticketId/dependencies`, `GET /tickets/:ticketId/dependencies`
- [ ] **Branch:** `feature/ticket-dependencies`
- [ ] **Test Requirement:** Test that a ticket cannot transition to DONE if its blocking tickets are not yet DONE.
- [ ] **Task:** Implement File Attachments with 10MB size limit and strict mime-type validation.
- [ ] **Endpoints:** `POST /tickets/:ticketId/attachments`, `DELETE /tickets/:ticketId/attachments/:attachmentId`
- [ ] **Branch:** `feature/attachments`
- [ ] **Test Requirement:** Inject a mock file > 10MB and assert an HTTP 413 or 400 error is thrown. Configure Swagger multipart file upload properties.
- [ ] **Task:** Implement CSV Export/Import for Tickets.
- [ ] **Endpoints:** `GET /tickets/export?projectId=:id`, `POST /tickets/import`
- [ ] **Branch:** `feature/csv-import-export`
- [ ] **Test Requirement:** Test the CSV parser with mock strings containing commas and quotes to ensure proper escape handling.
- [ ] **Task:** Implement @Mention Mechanism inside comment bodies.
- [ ] **Endpoints:** `GET /users/:userId/mentions`
- [ ] **Branch:** `feature/mentions`
- [ ] **Test Requirement:** Write a regex/parser test asserting that "@username" is successfully extracted case-insensitively and linked to the user ID.
- [ ] **Task:** Implement Auto-Scheduling Escalation (Cron Job) for overdue tickets.
- [ ] **Branch:** `feature/auto-escalate`
- [ ] **Test Requirement:** Mock the system clock/date. Ensure a ticket past its `dueDate` increments priority by exactly one step.
- [ ] **Task:** Implement Auto-Assignment to the least-loaded DEVELOPER on ticket creation.
- [ ] **Endpoints:** `GET /projects/:projectId/workload`
- [ ] **Branch:** `feature/auto-assign`
- [ ] **Test Requirement:** Mock two developers in a project (one with 2 open tickets, one with 0). Assert the newly created ticket defaults to the developer with 0 tickets.

## 6. Testing Framework & Methodology
* **Framework:** Use the pre-configured Jest framework. It is standard for NestJS and provides excellent mocking capabilities.
* **Methodology:** Use `jest.mock()` to isolate your services. 
* Do not hit the actual PostgreSQL database during unit tests. 
* Instead, mock the TypeORM `@InjectRepository()` instances to return static data. 
* Use Supertest (already in `app.e2e-spec.ts`) exclusively for integration tests hitting a test database.

## 7. Definition of Done (DoD)
* Code compiles cleanly with `npm run build`.
* Feature branch is fully up to date with the `main` branch.
* Unit test coverage for the new feature is at least 80%.
* `npm run test` and `npm run test:e2e` pass with 0 failures.
* No invalid values can bypass the API input validation logic.
* Informative HTTP status codes and error messages are returned for failures.
* All endpoints are fully decorated and accurately visible in the local Swagger UI contract.