# AI Interaction Transcript & Agent Methodology

- **Model Used:** Gemini 3.5 Flash
- **Environment:** VS Code Terminal & Custom Copilot Protocol

---

## 1. Initial Framing & Role Definition

### Prompt

"We are starting a technical take-home assignment for AT&T. I am using Gemini for this session. You will act as my specialized agent/co-pilot. Do not write any code yet. First, I will provide the assignment description, and your only task is to extract the core constraints, potential edge cases, and architectural considerations. Acknowledge this, and I will paste the requirements."

### Agent Response Summary

The agent explicitly acknowledged the assignment boundaries, agreed to act under strict direction without generating preemptive raw code, and prepared to process the core system constraints.

---

## 2. Defining Agent Skills & System Instructions

### Prompt

"Before we design the solution, let's build the system instruction profile that will govern your generation process. Define a set of rules covering: memory efficiency, error/exception handling strategies, concurrency/thread-safety requirements, and strict code style alignment. Output this as a clean markdown block titled 'System Instructions' so I can save it to .ai/system_instructions.txt."

> **Note:** The resulting configuration outputted by the agent was validated and saved directly to `.ai/system_instructions.txt`.

---

## 2.5 Architectural Design & Verification (The System Plan)

### Prompt

"Using the system instructions we just established, propose a high-level system architecture and step-by-step development plan. Break down the components (e.g., interfaces, data models, processing engine). For each component, state the underlying algorithmic complexity and why this approach fits AT&T's scale."

### Agent Response Summary & Architectural Blueprint

The architectural blueprint was finalized to utilize a modular NestJS monolithic layer backed by an indexed PostgreSQL instance via TypeORM. The system scales by isolating state management, enforcing strict transaction limits, and utilizing index-driven relational operations.

#### Verified Step-by-Step Development Plan

1. **Milestone 1: Foundations & OpenAPI Infrastructure**
   - _Scope:_ Initializing the NestJS framework environment, setting up global validation pipelines, and integrating Swagger UI documentation modules.
   - _Complexity:_ $O(1)$ routing overhead.

2. **Milestone 2: Identity & Authentication Services**
   - _Scope:_ Implementing the `User` Entity model, setting up secure password hashing via bcrypt, and developing stateless JWT token management alongside an optimized in-memory array/database token blacklist for immediate logouts.
   - _Complexity:_ $O(1)$ for token validation, $O(\text{rounds})$ for cryptographic hashing.

3. **Milestone 3: Core Business Domain (Projects & Tickets CRUD)**
   - _Scope:_ Implementing the relational database structures for Projects and Tickets. Integrating global binary soft-delete mechanisms (`isDeleted`), enforcing immutable state machines for forward-only ticket status changes, and establishing concurrent transaction safety with Optimistic Locking (`@VersionColumn`).
   - _Complexity:_ $O(1)$ for indexed target updates; $O(K)$ query scaling for project-specific aggregations.

4. **Milestone 4: Advanced Ticket Interactions & Relations**
   - _Scope:_ Developing the Comment system with regex-parsed user `@mentions`, building cross-ticket blocker relationship mappings (Ticket Dependencies), and setting up Multipart/Form-Data attachment upload handling streams.
   - _Complexity:_ $O(N)$ string parsing for mention extractions, $O(1)$ dependency graph linkage lookups.

5. **Milestone 5: Automation Services & Batch Engines**
   - _Scope:_ Creating an asynchronous Cron scheduler engine for real-time ticket expiration checks (Auto-Escalation), an automated task distribution algorithm for load-balanced developer routing (Auto-Assignment), and a buffered CSV stream parser for data import/export.
   - _Complexity:_ $O(U \cdot T)$ processing scaling for background automation iterations, $O(M)$ processing for linear batch streaming files.

---

## 3. Component Implementation & Self-Correction Loops

### Component A: Users Management & JWT Authentication

#### Prompt

"Let's implement the User Management and JWT Authentication infrastructure following our `.ai/system_instructions.txt`. Ensure password hashing via bcrypt, stateless JWT issuance, and a mechanism for blacklisting tokens upon logout."

#### Human Intervention / Course Correction

"Looking closely at the official assignment specifications, the `POST /users` endpoint payload example does not declare an incoming password field, but our downstream login logic expects one. Additionally, the standard Swagger output is polluting our database entities with documentation attributes."

#### Final Verified Logic Explanation

To preserve complete API contract compliance for automated test runners while keeping authentication functional, I explicitly separated concerns: I updated the user DTO to treat passwords as optional fields and moved all `@ApiProperty()` decorators out of the core entities and directly into the input-output DTO boundaries.

---

### Component B: Projects CRUD & Soft Delete Engineering

#### Prompt

"Propose the implementation for the Projects CRUD layer. Include fields for soft deletion handling as mandated by the instructions."

#### Human Intervention / Course Correction

"I noticed that you defined `ownerId` with a unique index, which would fundamentally break system constraints by preventing a single user from creating or owning multiple projects. Furthermore, your `deletedAt` flag is mixing TypeScript Date types with raw database enum states."

#### Final Verified Logic Explanation

I intervened to restructure the schema constraints. I removed the faulty unique index on `ownerId` to support a proper one-to-many relationship topology and split the soft delete strategy into two explicit indicators: a fast binary `isDeleted: boolean` flag and an auditable `deletedAt: Date | null` timestamp.

---

## 4. Current Milestone & Progress State

- **Milestone 1 (Infrastructure & Contracts):** Fully verified and active.
- **Milestone 2 (User & Auth Engine):** Unit tests passing at 100% test coverage.
- **Milestone 3 (Projects CRUD Module):** Specifications fully passing.

---

### Component C: Ticket Management with Strict Status Transitions & Optimistic Locking

#### Prompt

"We are implementing the Tickets CRUD Module for our IssueFlow NestJS application. Follow our local .ai/system_instructions.txt profile closely. Please generate the structural files including Optimistic Locking using a `@VersionColumn()`, a strict forward-only state machine, a mutability boundary blocking updates on DONE tickets, and a soft delete mechanism."

#### Human Intervention / Course Correction

- **Literal Naming Refactor:** The initial AI generation followed my prompt naming instructions too literally, resulting in a file named `projects.controller.ts` inside the `tickets/` domain directory and utilizing the `@Controller('projects')` route naming convention. I manually intervened to rename the artifact to `tickets.controller.ts`, refactored the class footprint to `TicketsController`, and correctly updated the route namespace to `@Controller('tickets')`.
- **Security & Auth Leak:** During the validation review of the generated `TicketsController`, I discovered that the model omitted the authentication lifecycle wrappers, exposing core endpoints to unauthenticated requests. I patched this security issue by injecting `@UseGuards(JwtAuthGuard)` and `@ApiBearerAuth()`.
- **Query Type Parsing:** I refactored the query pipeline to use an inline, optional `ParseIntPipe` instantiation directly within the argument signature rather than manually executing raw string parsing operations inside the controller method body.
- **REST Contract Compliance:** I corrected the HTTP response status code for ticket deletion from `204` back to a standard `200` to comply precisely with the project's verification test specification constraints.

#### Final Verified Logic Explanation

The Ticket module implements a strict state machine pattern and protects data integrity using TypeORM's built-in Optimistic Locking via a `@VersionColumn`. By catching `OptimisticLockVersionMismatchError` in the service layer, concurrent updates from multiple threads or users fail gracefully instead of silently overwriting historical data. Business workflows are secured at the service boundary: any backward status transition is rejected using array-index evaluations, and tickets marked as `DONE` are completely locked from retroactive mutation, protecting the auditing timeline.

---

### Component C.2: Ticket Management - Unit Testing

#### Prompt for Unit Testing

"Generate comprehensive Unit Tests for `TicketsService` and `TicketsController`. Ensure the test suites explicitly enforce the business rules: rejecting backward status transitions, locking `DONE` tickets, verifying that concurrent updates fail gracefully with version checking, and strictly asserting HTTP 200 response codes per the requirements document."

#### Human Intervention / Testing Course Corrections

- **Test Bed Auth Guard Isolation:** The AI-generated controller tests failed to compile because the NestJS testing module attempted to instantiate the `JwtAuthGuard` without its required `AuthService` dependency. I manually intervened to isolate the controller by chaining `.overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })` to the test module builder, cleanly bypassing external auth dependencies during unit evaluation.
- **TypeORM QueryBuilder Mocking:** The service tests crashed with a `TypeError` because the AI's mock repository only stubbed basic methods (`find`, `findOne`) and missed the `createQueryBuilder` chain used in `findAll`. I manually injected a chainable mock object (`where`, `andWhere`, `getMany`) to satisfy the fluent API structure.
- **Optimistic Locking Constructor Alignment:** To test the concurrency lock, the AI initially mocked a generic JavaScript `Error` object and mutated its `name` property. This failed because TypeORM's `catch` block relies on strict prototype evaluation. I corrected this by explicitly importing TypeORM's native `OptimisticLockVersionMismatchError`, supplying the three required constructor arguments required by the modern TypeORM v0.3.x+ API (`entityName`, `expectedVersion`, `receivedVersion`), and aligning the test's expectation to strictly assert a `ConflictException` (HTTP 409).

---

### Component D: Comment Management Module

#### Task

Implement the Comment CRUD Module on the `feature/comment-crud` branch, strictly adhering to the API contract, including nested routing, HTTP 200 responses, and @Mention extraction.

#### Phase 1: Initial Prompt

"We are implementing the Comment Management Module for our IssueFlow NestJS application on the `feature/comment-crud` branch. As a senior software engineer, please generate the complete module (Entity, DTOs, Service, Controller, and Unit Tests) adhering strictly to these exact structural requirements:

- **Entity Schema (`Comment`):** `id`, `content`, `authorId`, `ticketId`, `version` (`@VersionColumn`), `createdAt`, `updatedAt`.
- **Core Endpoints:** `GET /tickets/:ticketId/comments`, `POST /tickets/:ticketId/comments`, `PATCH /comments/:commentId`, `DELETE /comments/:commentId`.
- **Concurrency Control:** Implement Optimistic Locking using the `@VersionColumn`. Catch `OptimisticLockVersionMismatchError` and throw a `ConflictException` (HTTP 409).
- **Testing:** Mock concurrent edit attempts to ensure optimistic locking validation works. Override AuthGuard in controller tests."

#### Phase 1: Human Intervention & Validation

- **Architectural Validation:** The initial AI generation was structurally accurate. I verified that `authorId` was strictly omitted from `UpdateCommentDto` to prevent attribution theft. I ran the unit test suite to physically verify the optimistic locking mock, proving that the custom `saveComment` helper correctly intercepted TypeORM's `OptimisticLockVersionMismatchError`.

#### Phase 2: Refactoring Prompt (API Contract & @Mentions)

"Refactor the Comment Management Module to strictly comply with the provided API Contract and implement the @Mention extraction logic (Requirement 3.6).

1. Refactor the `CommentsController` to use nested routing (`@Controller('tickets/:ticketId/comments')`) and enforce `@HttpCode(200)` explicitly on all endpoints.
2. In the `CommentsService`, intercept the `content` string, use a case-insensitive regex to extract `@username` mentions, validate them against the User entity, and return the `mentionedUsers` array in the response."

#### Phase 2: Human Intervention & Debugging

- **Security & Payload Optimization (Data Leakage Prevention):** During the `@Mention` resolution logic, the AI queried and attached the entire `User` entity to the response. To prevent sensitive data leakage (e.g., passwords, emails), I manually injected a `.select(['user.id', 'user.username', 'user.fullName'])` clause into the `createQueryBuilder` to ensure the payload exactly matched the required JSON structure without exposing internal user data.
- **Test Suite Mock Debugging:** Injecting the `.select()` clause caused the `CommentsService` unit tests to crash with a `TypeError`, as the isolated test mock did not recognize the new query builder function. I manually intervened in `comments.service.spec.ts` and added `select: jest.fn().mockReturnThis()` to the `mockUserQueryBuilder`, instantly restoring the test suite to a 100% passing state.

#### Final Verified Logic Explanation

The Comment Management module provides a robust, concurrent-safe CRUD interface that fully complies with the provided nested routing specifications (`/tickets/:ticketId/comments/:commentId`) and HTTP 200 status expectations. It successfully parses comment text for `@mentions` using regex validation, securely queries the database for matching users without leaking sensitive fields, and attaches them to the response payload. Data integrity remains protected through the established Optimistic Locking mechanism (`@VersionColumn`), which cleanly rejects concurrent edit attempts (HTTP 409), maintaining DRY principles via a centralized `saveComment` helper.

---

### Component E: Audit Log Module (Append-Only System)

#### Task

Implement a persistent, append-only Audit Log for state-changing actions and integrate it with the `TicketsService` to automatically record ticket lifecycles.

#### Prompt

"We are implementing the Audit Log Module for our IssueFlow NestJS application on the `feature/audit-logging` branch. As a senior software engineer, please generate the complete module.

- **Entity Schema (`AuditLog`):** `id`, `action`, `entityType`, `entityId`, `performedBy`, `actor`, `timestamp`. **Critical:** This table is append-only. Do not include an `@UpdateDateColumn` or a `@VersionColumn`.
- **Core Endpoint:** `GET /audit-logs` accepting optional query parameters (`entityType, entityId, action, actor`) and returning HTTP 200 OK.
- **Service Logic:** Implement `logAction` to save new entries. Do not implement `update` or `delete`.
- **Integration Task:** Update `TicketsModule` and `TicketsService` to inject the `AuditLogsService`. When a ticket is created, updated, or soft-deleted, automatically call `logAction` with the correct payload. Update `tickets.service.spec.ts` to mock and verify this cross-module behavior."

#### Human Intervention / Course Correction

- **Dependency Wiring Verification:** The AI successfully constructed a completely immutable, append-only Audit Log service without mutating routes. However, upon reviewing the `TicketsService` integration, I noticed the initial actor flag was misaligned (defaulting to `SYSTEM` instead of `USER`). I prompted the AI to refactor the dependency injection to explicitly utilize `AuditActor.USER` across all ticket lifecycles (`CREATE`, `UPDATE`, `DELETE`) and to update the mocked assertion within `tickets.service.spec.ts` to properly pass the integration test.

#### Final Verified Logic Explanation

The Audit Log module enforces strict historical immutability by omitting TypeORM update columns or service-level mutation methods. It serves as a central ledger. The `TicketsService` is now tightly coupled to this ledger via NestJS Dependency Injection. To adhere to DRY principles, a private `logTicketAction` helper wraps the cross-module call, guaranteeing that every state-changing business transaction (creation, forward status transition, and soft deletion) reliably generates a persistent, read-only audit trail accessible via the dynamically filtered `GET /audit-logs` endpoint.

---

### Component F: Ticket Dependencies (Blockers)

#### Task

Implement a self-referencing dependency mechanism where tickets can block other tickets. Enforce a business rule preventing a ticket from transitioning to `DONE` if it has unresolved blockers, strictly adhering to the API contract.

#### Phase 1: Prompt

"Implement Ticket Dependencies (Blockers) on the `feature/ticket-dependencies` branch.

1. **Entity:** Add a self-referencing `@ManyToMany` relationship (`blockedBy` and `blocking`) with a `@JoinTable()` to the `Ticket` entity.
2. **Controller:** Create `TicketDependenciesController` at `tickets/:ticketId/dependencies` with `POST /`, `GET /`, and `DELETE /:blockerId` endpoints, all enforcing `@HttpCode(200)`.
3. **Service Logic:** Ensure both tickets exist and belong to the same project before linking. Crucially, intercept `TicketsService.update()`: if transitioning to `TicketStatus.DONE`, verify that all tickets in the `blockedBy` array are also `DONE`. Throw a `BadRequestException` if unresolved blockers exist.
4. **Testing:** Write controller tests and explicitly add a test case in `tickets.service.spec.ts` asserting that the `DONE` transition fails gracefully when a blocker remains `IN_PROGRESS`."

#### Phase 1: Human Intervention & Validation

- **Architectural & Security Validation:** I reviewed the AI's generated TypeORM relationship mapping. The AI correctly explicitly defined the `joinColumn` and `inverseJoinColumn` names within the `@JoinTable()` decorator, preventing the framework from auto-generating ambiguous database schema columns.
- **Performance Optimization Review:** I validated the `findOne` method in the `TicketsService`. The AI smartly introduced an optional boolean flag (`loadBlockedBy = false`) to selectively execute the heavy database `JOIN` operation only when checking dependencies, preserving the read performance of standard ticket fetching.
- **Test Verification:** I ran the unit test suite (`npm run test src/tickets/`) and physically verified that the mocked `DONE` transition accurately triggered the HTTP 400 `BadRequestException` as required by the business constraints.

#### Final Verified Logic Explanation

The Ticket Dependencies module utilizes a self-referencing Many-to-Many SQL relationship via a dedicated junction table (`ticket_dependencies`). To respect SOLID principles and keep routing boundaries clean, network requests are handled by an isolated `TicketDependenciesController` rather than bloating the main `TicketsController`. The core business logic resides safely in the `TicketsService`, where strict guardrails ensure cross-project dependencies are rejected and idempotent logic prevents duplicate blocker records. Finally, the state machine is fortified: any attempt to mark a ticket as `DONE` triggers a proactive database check against its blockers, guaranteeing workflow integrity before saving state.

---

### Component G: Architecture Refactoring & Attachment Management

#### Task

1. Refactor the bloated `TicketsModule` into a clean Domain-Driven Design (DDD) directory structure.
2. Implement secure File Attachments for tickets, enforcing a strict 10MB size limit and MIME-type validation, while fully supporting Swagger UI file uploads.

#### Phase 1: Architectural Refactoring Prompt (DDD)

"The `src/tickets` directory has become bloated. Please refactor the directory structure to group files by their sub-domains. Create `/attachments`, `/dependencies`, `/dto`, and `/entities` folders. Move all relevant controllers, services, DTOs, entities, and spec files into their respective sub-directories. Automatically update all relative import paths across the entire `TicketsModule` and ensure the application compiles and passes all unit tests."

#### Phase 1: Refactoring Validation

- **Architectural Integrity:** The AI successfully transitioned the flat folder structure into a scalable DDD pattern without breaking NestJS module boundaries. I verified that all internal imports were correctly re-linked and the test suite (`npm run test src/tickets/`) ran completely green, confirming no regressions in the core ticketing or dependency logic.

#### Phase 2: Attachment Feature Prompt

"Implement File Attachments with a 10MB size limit and strict MIME-type validation on the `feature/attachments` branch.

1. **Entity:** Create an `Attachment` entity (`id`, `ticketId`, `filename`, `contentType`) with a `@ManyToOne` relation to `Ticket`.
2. **Controller:** Create `TicketAttachmentsController` with `POST /` and `DELETE /:attachmentId` (returning `@HttpCode(200)`).
3. **Validation (Critical):** Use `@UseInterceptors(FileInterceptor('file'))` and `ParseFilePipe` with `MaxFileSizeValidator` (10MB) and `FileTypeValidator` (png, jpeg, pdf, plain text).
4. **Swagger:** Decorate the `POST` route with `@ApiConsumes('multipart/form-data')` and configure the `@ApiBody` to render a file picker UI.
5. **Testing:** Write a unit test asserting that uploading a file > 10MB throws a Payload Too Large (413) or BadRequest (400) exception."

#### Phase 2: Human Intervention & Security Validation

- **Memory Exhaustion Prevention:** I reviewed the AI's implementation of the upload pipeline. By utilizing NestJS's native `ParseFilePipe` directly in the controller route signature, the application safely rejects oversized payloads _before_ they are loaded into the service layer's memory, protecting the server from DoS (Denial of Service) via large file uploads.
- **API Consumer UX:** I verified the Swagger UI decorators. The AI correctly mapped the schema to type `string` with format `binary`, which forces the Swagger dashboard to render a native OS file-picker button rather than a raw JSON text box, perfectly fulfilling the frontend contract.

---

### Component H: Bulk Operations (CSV Export/Import)

#### Task

Implement a memory-safe CSV Export and Import feature for the `tickets` domain. The import must handle bulk ticket creation with graceful partial success (logging errors per row instead of full rollback), and both endpoints must utilize Node.js streams to prevent V8 memory exhaustion.

#### Prompt

"Implement the CSV Export/Import feature for the `tickets` domain based on the following requirements:

- **Export:** `GET /tickets/export?projectId={id}` -> Returns a CSV file.
- **Import:** `POST /tickets/import` -> Accepts a CSV file (`multipart/form-data`) and `projectId`. Returns `{ "created": number, "failed": number, "errors": array }`.

**Architectural & Structural Rules:**

1. **DDD Isolation:** Create a dedicated sub-domain: `src/tickets/bulk-operations/`.
2. **Memory-Safe Export (Streaming):** Use a database cursor/stream and pipe it through a library like `csv-stringify`, returning a NestJS `StreamableFile`. Do NOT load all tickets into RAM.
3. **Memory-Safe Import:** Protect the route with `ParseFilePipe` (MIME: `text/csv`, Max Size). Process the incoming buffer asynchronously.
4. **CSV Edge Cases:** Correctly handle commas and quotes inside field values (e.g., `,,,"""`).
5. **Partial Success Execution:** Process all rows, saving valid ones and pushing invalid ones to the `errors` array. Do not roll back the entire batch on a single failure.
6. **Testing:** Include a test case using mock CSV strings containing complex commas and escaped quotes to mathematically prove the parser."

#### Human Intervention & Validation

- **Memory & Backpressure Validation:** I reviewed the `parser.on('data')` block. The AI perfectly implemented Node.js stream backpressure by calling `parser.pause()` before the asynchronous TypeORM database save, and `parser.resume()` in the `finally` block. This guarantees the application will not flood the Postgres connection pool even with a 100,000-row CSV.
- **Edge Case Verification:** I validated the service unit tests. The AI successfully utilized the `csv-parse` AST parser to handle complex strings like `"A field with, commas and ""escaped quotes"""`, completely avoiding the pitfalls of naive `string.split(',')` implementations.

#### Final Verified Logic Explanation

The Bulk Operations module acts as a highly resilient, memory-safe data pipeline. By isolating it into a `bulk-operations` DDD sub-folder, the core `TicketsController` remains clean. The export endpoint utilizes TypeORM's `QueryBuilder.stream()` to pipe database rows directly to the TCP client, while the import endpoint utilizes an asynchronous chunked parser. The partial-success architecture elegantly catches validation and database errors row-by-row, returning a precise `{ created, failed, errors }` diagnostic payload without disrupting valid data ingestion.

### Component I: The @Mention Mechanism & Security Patch (Requirement 3.6)

#### Task:

Implement the `@Mention` parsing mechanism for ticket comments and resolve critical payload leaks and architectural coupling identified during the domain audit.

#### Prompt:

"Implement Requirement 3.6 and resolve the critical security leaks. Phase 1: Fix Password Leak (CRITICAL) by updating the `User` entity to ensure the hashed password has `select: false`. Fix domain coupling by importing `UsersModule` into `CommentsModule` using NestJS's `forwardRef()`. Phase 2: Implement `GET /users/:userId/mentions` sorted by `createdAt DESC`. Ensure the payload strictly maps only the `id`, `username`, and `fullName`."

#### Human Intervention / Course Correction:

- **Security & Payload Optimization:** The initial codebase audit caught a severe vulnerability where hashed passwords would leak in the comment payload due to default ORM relational queries. I executed the fix by strictly enforcing `{ select: false }` on the `password` column at the Entity level, and manually overriding it with `.addSelect('user.password')` exclusively during the authentication login query. Furthermore, I implemented a `mapComment` DTO boundary to strictly sanitize the network response.
- **Domain Decoupling:** The original `CommentsModule` was bypassing DDD boundaries by injecting the raw `UserRepository`. I refactored this to inject the `UsersService` using `forwardRef()`, allowing bidirectional domain communication without crashing the DI container.

#### Final Verified Logic Explanation:

The `@Mention` mechanism now securely parses strings via regex and fetches user metadata without exposing sensitive database columns. The junction table (`comment_mentions`) automatically synchronizes during comment creation and updates. The domains communicate safely, preserving strict Domain-Driven Design boundaries while fulfilling the exact HTTP 200 API contract for mention retrieval.

---

### Component J: Auto-Scheduling Escalation (Requirement 3.7)

#### Task:

Implement an asynchronous Cron job to automatically escalate ticket priorities (LOW → MEDIUM → HIGH → CRITICAL) when they remain unresolved past a configured `dueDate`.

#### Prompt:

"Implement Auto-Scheduling Escalation from scratch. Add `dueDate` and `isOverdue` to the `Ticket` entity. In `TicketsService.update()`, intercept manual priority changes to force `isOverdue = false`. Create a `@Cron` job that queries overdue active tickets and promotes their priority. Use `.save()` to ensure Optimistic Locking hooks fire. In testing, mandate the use of `jest.useFakeTimers()` to mathematically prove the escalation steps."

#### Human Intervention / Course Correction:

- **Optimistic Locking Compatibility:** I specifically engineered the prompt to forbid the AI from using raw SQL `UPDATE` queries (like `.update()`) inside the cron job. By forcing the use of the repository's `.save()` method, I ensured that TypeORM's Optimistic Locking (`@VersionColumn`) and the Audit Log triggers would fire correctly during background automation.
- **State Reset Logic:** I recognized that manual `PATCH` priority updates needed to reset the auto-escalation state, which is an easily missed edge case. I explicitly directed the AI to intercept these updates to maintain state machine integrity.

#### Final Verified Logic Explanation:

The `@nestjs/schedule` module safely iterates through overdue tickets in the background. The system is entirely idempotent: once a ticket reaches `CRITICAL`, it simply toggles the `isOverdue` flag without attempting further escalations. Unit tests accurately simulate the passage of time using mocked system clocks to prove the priority shifts and the manual reset overrides.

---

### Component K: Auto-Assignment by Workload (Requirement 3.8)

#### Task:

Implement an auto-assignment algorithm to route newly created unassigned tickets to the least-loaded DEVELOPER within a project.

#### Prompt:

"Implement the Workload API (`GET /projects/:projectId/workload`) using an optimized TypeORM `createQueryBuilder` aggregation. Intercept ticket creation: query developers linked to the project, calculate their active workload, and assign the ticket to the developer with the lowest open ticket count, tie-breaking by `createdAt ASC`. Log the action as `SYSTEM`."

#### Human Intervention / Course Correction:

- **Architectural Risk Mitigated (The Linkage Gap):** The AT&T requirements requested assigning tickets to developers "linked to the project," but no database relationship existed to map this. Initially, a global developer pool was assumed. However, recognizing this as a classic take-home assignment "trap" designed to test database modeling skills, I intervened. I engineered a follow-up prompt to proactively build a `@ManyToMany` `project_members` junction table between Projects and Users, completely resolving the missing domain link.
- **The N+1 Query Guard:** To prevent memory exhaustion, I strictly forbade the AI from using `for` loops to count tickets, forcing a highly optimized `LEFT JOIN` and `COUNT()` aggregation natively within PostgreSQL.

#### Final Verified Logic Explanation:

The system dynamically calculates developer workloads in real-time without suffering from N+1 query degradation. The algorithm correctly defaults to the `AuditActor.SYSTEM` when an automated assignment occurs, keeping the append-only ledger accurate. Ties are deterministically broken via SQL-level `.addOrderBy` commands, ensuring the oldest registrant receives the workload safely and consistently.
