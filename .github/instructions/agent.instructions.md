---
description: Core architectural constraints, DDD standards, and memory-safety guidelines for the IssueFlow backend.
applyTo: '**/*.ts'
---

# IssueFlow Backend - AI System Instructions Profile

## 1. AI Output & Behavioral Directives

- **No Hallucinations:** Never invent or implement features, endpoints, or constraints that were not explicitly requested.
- **Lazy Generation Forbidden:** When writing or modifying code, do not use placeholders like `// ... existing code`. Provide the exact block that needs replacing.
- **Terse Responses:** Skip conversational filler. Output code and architectural reasoning only.

## 2. Code Style & DDD Architecture

- **Tech Stack:** NestJS 11.x, TypeScript 5.x.
- **Domain-Driven Design (DDD):** Maintain strict domain isolation. Do not cross-contaminate controllers. Use sub-directories for complex domains (e.g., `src/tickets/attachments`).
- **Data Access:** Strictly use the Data Mapper pattern (Repositories). **NEVER** use the Active Record pattern.
- **Typing:** Enforce strict TypeScript typing. `any` is strictly forbidden.

## 3. Concurrency & Data Integrity

- **Optimistic Concurrency Control (OCC):** All shared, state-mutating entities (Tickets, Comments) MUST include an `@VersionColumn()`.
- **Conflict Handling:** Always wrap `repository.save()` in a try/catch. Intercept TypeORM's `OptimisticLockVersionMismatchError` and translate it into a NestJS `409 ConflictException`.
- **Soft Deletion:** NEVER write SQL `DELETE` operations for core business entities. Toggle an `isDeleted` boolean flag to preserve relational integrity.
- **Append-Only Ledger:** The `AuditLog` entity is strictly immutable. NEVER add `@UpdateDateColumn` or `@VersionColumn` to it.

## 4. Memory, Security, & Validation

- **DTO Strictness:** Enforce absolute input validation. All DTOs must use `class-validator` and `class-transformer`. The global pipe handles `whitelist: true` and `forbidNonWhitelisted: true`.
- **Memory Protection:** Defend against DoS attacks. File uploads must ALWAYS use NestJS's `ParseFilePipe` with a `MaxFileSizeValidator` injected directly at the Controller level to prevent V8 memory exhaustion.
- **Data Leakage:** When querying relational user data, ALWAYS use explicit `.select(['id', 'username'])` builders to prevent password hashes or PII from entering the runtime memory pool or API responses.

## 5. Error & Exception Handling

- **HTTP Mapping:** Zero unhandled server exceptions. Map every edge case and TypeORM constraint failure to explicit, secure NestJS HTTP Exceptions (e.g., `400 BadRequest`, `404 NotFound`).
- **State Machines:** Enforce strict, forward-only workflows in Services. Always validate state transitions before executing a database query.

## 6. Testing

- **Isolation:** When writing `.spec.ts` unit tests, completely mock all TypeORM repositories and cross-domain services using `jest.fn()`. Tests must run purely in memory without a database connection.
