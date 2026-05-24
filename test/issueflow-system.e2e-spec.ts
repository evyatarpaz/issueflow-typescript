import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('IssueFlow System (e2e)', () => {
  let app: INestApplication;
  let jwtToken: string;
  let projectId: number;
  let ticketAId: number;
  let ticketBId: number;

  // 1. Setup & Teardown
  // - Initialize the INestApplication using the AppModule
  // - Apply global validation pipes (ValidationPipe)
  // - Ensure app.close() is called in afterAll
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply global validation pipes for DTO enforcement
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    // Prevent memory leaks by properly closing the app
    await app.close();
  });

  describe('Phase 1: Security & Identity', () => {
    const testUser = {
      username: `e2e_user_${Date.now()}`,
      email: `e2e_${Date.now()}@example.com`,
      fullName: 'E2E Test User',
      password: 'StrongPassword123!',
      role: 'ADMIN', // Elevated privileges for full E2E traversal
    };

    it('should register a new user', async () => {
      // Requirement: Test POST /users to create a test user
      const response = await request(app.getHttpServer())
        .post('/users')
        .send(testUser)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body.username).toEqual(testUser.username);
    });

    it('should authenticate the user and return a JWT', async () => {
      // Requirement: Test POST /auth/login to authenticate. Extract and store the JWT token.
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: testUser.username,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      jwtToken = response.body.accessToken;
    });

    it('should throw 401 Unauthorized when hitting a protected route without a token', async () => {
      // Requirement: Ensure a 401 Unauthorized is thrown when attempting to hit a protected route without this token.
      await request(app.getHttpServer()).get('/projects').expect(401);
    });
  });

  describe('Phase 2: Core Domain (Projects & Tickets)', () => {
    it('should create a new Project', async () => {
      // Requirement: Create a new Project and store its id.
      const response = await request(app.getHttpServer())
        .post('/projects')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          name: `E2E Project ${Date.now()}`,
          description: 'A test project for E2E validation',
        })
        .expect(200);

      expect(response.body).toHaveProperty('id');
      projectId = response.body.id;
    });

    it('should create multiple Tickets assigned to that Project', async () => {
      // Requirement: Create multiple Tickets assigned to that Project.
      const resA = await request(app.getHttpServer())
        .post('/tickets')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          title: 'Ticket A',
          description: 'Core functionality',
          projectId: projectId,
          type: 'FEATURE',
          priority: 'HIGH',
        })
        .expect(200);

      ticketAId = resA.body.id;

      const resB = await request(app.getHttpServer())
        .post('/tickets')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          title: 'Ticket B',
          description: 'Security patch',
          projectId: projectId,
          type: 'BUG',
          priority: 'CRITICAL',
        })
        .expect(200);

      ticketBId = resB.body.id;
    });

    it('should reject backward status transitions per the state machine', async () => {
      // Requirement: Attempt to transition a ticket's status backward (e.g., from DONE to IN_PROGRESS).
      // Assert that the API correctly rejects this with a 400 or 409 error per the state machine requirements.

      // Step 1: Transition Ticket B to DONE
      await request(app.getHttpServer())
        .patch(`/tickets/${ticketBId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ status: 'DONE' })
        .expect(200);

      // Step 2: Attempt illegal backward transition to IN_PROGRESS
      await request(app.getHttpServer())
        .patch(`/tickets/${ticketBId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ status: 'IN_PROGRESS' })
        .expect(400);
    });
  });

  describe('Phase 3: Complex Constraints (Dependencies)', () => {
    let ticketCId: number;

    it('should create a dependency relationship where Ticket A is blocked by Ticket C', async () => {
      // Creating a new ticket C that is IN_PROGRESS/TODO
      const resC = await request(app.getHttpServer())
        .post('/tickets')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          title: 'Ticket C',
          description: 'Blocks Ticket A',
          projectId: projectId,
          type: 'TECHNICAL',
        })
        .expect(200);

      ticketCId = resC.body.id;

      // Requirement: Create a dependency relationship where Ticket A is blocked by Ticket C.
      await request(app.getHttpServer())
        .post(`/tickets/${ticketAId}/dependencies`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ blockedBy: ticketCId })
        .expect(200);
    });

    it('should reject transitioning Ticket A to DONE while blocked by an incomplete Ticket C', async () => {
      // Requirement: Attempt to update Ticket A to DONE while its blocker is still IN_PROGRESS.
      // Assert that the API rejects this transition.
      await request(app.getHttpServer())
        .patch(`/tickets/${ticketAId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ status: 'DONE' })
        .expect(400);
    });
  });

  describe('Phase 4: Concurrency (Optimistic Locking)', () => {
    it('should prevent concurrent updates via optimistic locking', async () => {
      // Requirement: Simulate a race condition using Promise.all() where two concurrent PATCH requests
      // attempt to update the exact same ticket simultaneously.

      const request1 = request(app.getHttpServer())
        .patch(`/tickets/${ticketAId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ description: 'Concurrent Race 1' });

      const request2 = request(app.getHttpServer())
        .patch(`/tickets/${ticketAId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ description: 'Concurrent Race 2' });

      const [response1, response2] = await Promise.all([request1, request2]);

      // Requirement: Ensure exactly one request succeeds (200 OK) and the other fails due to a version mismatch (409 Conflict).
      const statuses = [response1.status, response2.status].sort();

      expect(statuses[0]).toBe(200);
      expect(statuses[1]).toBe(409);
    });
  });
});
