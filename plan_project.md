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

## 3. Git Workflow & Testing Strategy
* **Branching Strategy (Feature Branch Workflow):** Never commit directly to `main`. 
* Create a new branch for every task using the format `type/scope`. 
* Examples: `feature/user-registration`, `bugfix/ticket-status-update`, `test/auth-service`.
* **Commit Conventions (Conventional Commits):** Group logic into atomic commits.
* Use `feat: <description>` for new features.
* Use `fix: <description>` for bug fixes.
* Use `test: <description>` for adding or updating tests.
* Use `refactor: <description>` for code restructuring without changing behavior.
* **Unit Testing Policy:** Every feature branch MUST include comprehensive unit tests before being merged. No tests means the code is not done. 

## 4. Granular Feature Breakdown (The Roadmap)

### Milestone 1: Infrastructure & Database Setup
- [ ] **Task:** Initialize TypeORM and connect to the PostgreSQL Docker instance.
- [ ] **Branch:** `chore/db-setup`
- [ ] **Commit:** `feat: integrate TypeORM with Postgres config`
- [ ] **Test Requirement:** Write a simple e2e test verifying the application bootstraps and the database connection is established without throwing errors.

### Milestone 2: User Management & Authentication
- [ ] **Task:** Implement User entity and User registration endpoint (Roles: ADMIN or DEVELOPER).
- [ ] **Branch:** `feature/user-management`
- [ ] **Commit:** `feat: add user registration and fetch endpoints`
- [ ] **Test Requirement:** Mock the user repository. Test successful registration, ensure invalid roles are rejected, and test fetching users by ID.
- [ ] **Task:** Implement JWT Authentication (Login, Logout, Get Current Profile).
- [ ] **Branch:** `feature/jwt-auth`
- [ ] **Commit:** `feat: implement JWT login and auth guards`
- [ ] **Test Requirement:** Test that valid credentials return a signed JWT, invalid credentials return 401 Unauthorized, and protected routes block unauthenticated requests.

### Milestone 3: Core Entities (Projects, Tickets, Comments)
- [ ] **Task:** Implement Project CRUD operations.
- [ ] **Branch:** `feature/project-crud`
- [ ] **Commit:** `feat: add project creation and retrieval`
- [ ] **Test Requirement:** Validate that a project cannot be created without an ownerId. Test successful retrieval and updates.
- [ ] **Task:** Implement Ticket CRUD operations with strict status transitions (TODO -> IN_PROGRESS -> IN_REVIEW -> DONE).
- [ ] **Branch:** `feature/ticket-crud`
- [ ] **Commit:** `feat: add ticket lifecycle endpoints`
- [ ] **Test Requirement:** Write unit tests to explicitly enforce that backward transitions are rejected and a DONE ticket cannot be updated. 
- [ ] **Task:** Implement Comment CRUD and prevent simultaneous edits by different users.
- [ ] **Branch:** `feature/comment-crud`
- [ ] **Commit:** `feat: add ticket comments logic`
- [ ] **Test Requirement:** Mock concurrent edit attempts to ensure proper locking or validation logic rejects the second request.

### Milestone 4: Extended Business Logic
- [ ] **Task:** Implement a persistent, append-only Audit Log for state-changing actions.
- [ ] **Branch:** `feature/audit-logging`
- [ ] **Test Requirement:** Create a ticket via the service and verify an audit log record is automatically generated with the correct actor and action.
- [ ] **Task:** Implement Ticket Dependencies (Blockers).
- [ ] **Branch:** `feature/ticket-dependencies`
- [ ] **Test Requirement:** Test that a ticket cannot transition to DONE if its blocking tickets are not yet DONE.
- [ ] **Task:** Implement File Attachments with 10MB size limit and strict mime-type validation.
- [ ] **Branch:** `feature/attachments`
- [ ] **Test Requirement:** Inject a mock file > 10MB and assert an HTTP 413 or 400 error is thrown. Assert invalid file types (e.g., `.exe`) are rejected.
- [ ] **Task:** Implement CSV Export/Import for Tickets.
- [ ] **Branch:** `feature/csv-import-export`
- [ ] **Test Requirement:** Test the CSV parser with mock strings containing commas and quotes inside field values to ensure proper escape handling.
- [ ] **Task:** Implement Soft Delete and Restore for Projects and Tickets (ADMIN only).
- [ ] **Branch:** `feature/soft-delete`
- [ ] **Test Requirement:** Verify that a soft-deleted ticket does not appear in standard GET requests, and verify only ADMIN roles can restore it.
- [ ] **Task:** Implement @Mention Mechanism inside comment bodies.
- [ ] **Branch:** `feature/mentions`
- [ ] **Test Requirement:** Write a regex/parser test asserting that "@jdoe" is successfully extracted case-insensitively and linked to the user ID.
- [ ] **Task:** Implement Auto-Scheduling Escalation (Cron Job) for overdue tickets.
- [ ] **Branch:** `feature/auto-escalate`
- [ ] **Test Requirement:** Mock the system clock/date. Ensure a ticket past its `dueDate` increments priority by exactly one step and stops escalating once it hits CRITICAL.
- [ ] **Task:** Implement Auto-Assignment to the least-loaded DEVELOPER on ticket creation.
- [ ] **Branch:** `feature/auto-assign`
- [ ] **Test Requirement:** Mock two developers in a project (one with 2 open tickets, one with 0). Assert the newly created unassigned ticket defaults to the developer with 0 tickets.

## 5. Testing Framework & Methodology
* **Framework:** Use the pre-configured Jest framework. It is standard for NestJS and provides excellent mocking capabilities.
* **Methodology:** Use `jest.mock()` to isolate your services. 
* Do not hit the actual PostgreSQL database during unit tests. 
* Instead, mock the TypeORM `@InjectRepository()` instances to return static data. 
* Use Supertest (already in `app.e2e-spec.ts`) exclusively for integration tests hitting a test database.

## 6. Definition of Done (DoD)
* Code compiles cleanly with `npm run build`.
* Feature branch is fully up to date with the `main` branch.
* Unit test coverage for the new feature is at least 80%.
* `npm run test` and `npm run test:e2e` pass with 0 failures.
* No invalid values can bypass the API input validation logic.
* Informative HTTP status codes and error messages are returned for failures.

## 7. Timeline Estimation (3 Days)
* **Day 1: The Core Foundation.** Complete Milestone 1 and Milestone 2. Get the DB connected, users registered, and JWT authentication fully locking down the API.
* **Day 2: The Core Logic.** Complete Milestone 3 and begin Milestone 4. Focus heavily on Project and Ticket CRUD, ensuring the strict state machine transitions are bulletproof.
* **Day 3: Extended Systems & Polish.** Complete all automated jobs (Escalation, Assignment), file handling, and CSV logic. Finalize `run.md` documentation and ensure all tests are green.
