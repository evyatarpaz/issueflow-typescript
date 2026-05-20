# AI Interaction Transcript & Agent Methodology

* **Model Used:** Gemini 3.5 Flash
* **Environment:** VS Code Terminal & Custom Copilot Protocol

---

## 1. Initial Framing & Role Definition

### Prompt:
"We are starting a technical take-home assignment for AT&T. I am using Gemini for this session. You will act as my specialized agent/co-pilot. Do not write any code yet. First, I will provide the assignment description, and your only task is to extract the core constraints, potential edge cases, and architectural considerations. Acknowledge this, and I will paste the requirements."

### Agent Response Summary:
The agent explicitly acknowledged the assignment boundaries, agreed to act under strict direction without generating preemptive raw code, and prepared to process the core system constraints.

---

## 2. Defining Agent Skills & System Instructions

### Prompt:
"Before we design the solution, let's build the system instruction profile that will govern your generation process. Define a set of rules covering: memory efficiency, error/exception handling strategies, concurrency/thread-safety requirements, and strict code style alignment. Output this as a clean markdown block titled 'System Instructions' so I can save it to .ai/system_instructions.txt."

> **Note:** The resulting configuration outputted by the agent was validated and saved directly to `.ai/system_instructions.txt`.

---

## 2.5 Architectural Design & Verification (The System Plan)

### Prompt:
"Using the system instructions we just established, propose a high-level system architecture and step-by-step development plan. Break down the components (e.g., interfaces, data models, processing engine). For each component, state the underlying algorithmic complexity and why this approach fits AT&T's scale."

### Agent Response Summary & Architectural Blueprint:
The architectural blueprint was finalized to utilize a modular NestJS monolithic layer backed by an indexed PostgreSQL instance via TypeORM. The system scales by isolating state management, enforcing strict transaction limits, and utilizing index-driven relational operations.

#### Verified Step-by-Step Development Plan:

1. **Milestone 1: Foundations & OpenAPI Infrastructure**
   * *Scope:* Initializing the NestJS framework environment, setting up global validation pipelines, and integrating Swagger UI documentation modules.
   * *Complexity:* $O(1)$ routing overhead.

2. **Milestone 2: Identity & Authentication Services**
   * *Scope:* Implementing the `User` Entity model, setting up secure password hashing via bcrypt, and developing stateless JWT token management alongside an optimized in-memory array/database token blacklist for immediate logouts.
   * *Complexity:* $O(1)$ for token validation, $O(\text{rounds})$ for cryptographic hashing.

3. **Milestone 3: Core Business Domain (Projects & Tickets CRUD)**
   * *Scope:* Implementing the relational database structures for Projects and Tickets. Integrating global binary soft-delete mechanisms (`isDeleted`), enforcing immutable state machines for forward-only ticket status changes, and establishing concurrent transaction safety with Optimistic Locking (`@VersionColumn`).
   * *Complexity:* $O(1)$ for indexed target updates; $O(K)$ query scaling for project-specific aggregations.

4. **Milestone 4: Advanced Ticket Interactions & Relations**
   * *Scope:* Developing the Comment system with regex-parsed user `@mentions`, building cross-ticket blocker relationship mappings (Ticket Dependencies), and setting up Multipart/Form-Data attachment upload handling streams.
   * *Complexity:* $O(N)$ string parsing for mention extractions, $O(1)$ dependency graph linkage lookups.

5. **Milestone 5: Automation Services & Batch Engines**
   * *Scope:* Creating an asynchronous Cron scheduler engine for real-time ticket expiration checks (Auto-Escalation), an automated task distribution algorithm for load-balanced developer routing (Auto-Assignment), and a buffered CSV stream parser for data import/export.
   * *Complexity:* $O(U \cdot T)$ processing scaling for background automation iterations, $O(M)$ processing for linear batch streaming files.

---

## 3. Component Implementation & Self-Correction Loops

### Component A: Users Management & JWT Authentication

#### Prompt:
"Let's implement the User Management and JWT Authentication infrastructure following our `.ai/system_instructions.txt`. Ensure password hashing via bcrypt, stateless JWT issuance, and a mechanism for blacklisting tokens upon logout."

#### Human Intervention / Course Correction:
"Looking closely at the official assignment specifications, the `POST /users` endpoint payload example does not declare an incoming password field, but our downstream login logic expects one. Additionally, the standard Swagger output is polluting our database entities with documentation attributes."

#### Final Verified Logic Explanation:
To preserve complete API contract compliance for automated test runners while keeping authentication functional, I explicitly separated concerns: I updated the user DTO to treat passwords as optional fields and moved all `@ApiProperty()` decorators out of the core entities and directly into the input-output DTO boundaries.

---

### Component B: Projects CRUD & Soft Delete Engineering

#### Prompt:
"Propose the implementation for the Projects CRUD layer. Include fields for soft deletion handling as mandated by the instructions."

#### Human Intervention / Course Correction:
"I noticed that you defined `ownerId` with a unique index, which would fundamentally break system constraints by preventing a single user from creating or owning multiple projects. Furthermore, your `deletedAt` flag is mixing TypeScript Date types with raw database enum states."

#### Final Verified Logic Explanation:
I intervened to restructure the schema constraints. I removed the faulty unique index on `ownerId` to support a proper one-to-many relationship topology and split the soft delete strategy into two explicit indicators: a fast binary `isDeleted: boolean` flag and an auditable `deletedAt: Date | null` timestamp.

---

## 4. Current Milestone & Progress State
* **Milestone 1 (Infrastructure & Contracts):** Fully verified and active.
* **Milestone 2 (User & Auth Engine):** Unit tests passing at 100% test coverage.
* **Milestone 3 (Projects CRUD Module):** Specifications fully passing.

### Component C: Ticket Management with Strict Status Transitions & Optimistic Locking

#### Prompt:
"We are implementing the Tickets CRUD Module for our IssueFlow NestJS application. Follow our local .ai/system_instructions.txt profile closely. Please generate the structural files including Optimistic Locking using a `@VersionColumn()`, a strict forward-only state machine, a mutability boundary blocking updates on DONE tickets, and a soft delete mechanism."

#### Human Intervention / Course Correction:
* **Literal Naming Refactor:** The initial AI generation followed my prompt naming instructions too literally, resulting in a file named `projects.controller.ts` inside the `tickets/` domain directory and utilizing the `@Controller('projects')` route naming convention. I manually intervened to rename the artifact to `tickets.controller.ts`, refactored the class footprint to `TicketsController`, and correctly updated the route namespace to `@Controller('tickets')`.
* **Security & Auth Leak:** During the validation review of the generated `TicketsController`, I discovered that the model omitted the authentication lifecycle wrappers, exposing core endpoints to unauthenticated requests. I patched this security issue by injecting `@UseGuards(JwtAuthGuard)` and `@ApiBearerAuth()`.
* **Query Type Parsing:** I refactored the query pipeline to use an inline, optional `ParseIntPipe` instantiation directly within the argument signature rather than manually executing raw string parsing operations inside the controller method body.
* **REST Contract Compliance:** I corrected the HTTP response status code for ticket deletion from `204` back to a standard `200` to comply precisely with the project's verification test specification constraints.

#### Final Verified Logic Explanation:
The Ticket module implements a strict state machine pattern and protects data integrity using TypeORM's built-in Optimistic Locking via a `@VersionColumn`. By catching `OptimisticLockVersionMismatchError` in the service layer, concurrent updates from multiple threads or users fail gracefully instead of silently overwriting historical data. Business workflows are secured at the service boundary: any backward status transition is rejected using array-index evaluations, and tickets marked as `DONE` are completely locked from retroactive mutation, protecting the auditing timeline.