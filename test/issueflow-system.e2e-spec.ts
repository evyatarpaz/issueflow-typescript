import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Primary Integration Suite representing a real-world client interaction cycle.
 * Verifies that the bounded contexts (IAM, Projects, Tickets, Comments, Audit Logs)
 * integrate correctly. Specifically tests complex business rules: state machine transitions,
 * DAG dependency constraints, optimistic locking concurrency, and data residency (soft-deletes).
 */
describe('IssueFlow System (e2e)', () => {
  let app: INestApplication;
  let jwtToken: string;
  let userId: number; // Capturing the user ID for the project owner
  let projectId: number;
  let ticketAId: number;
  let ticketBId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Phase 1: Security & Identity', () => {
    const testUser = {
      username: `e2e_user_${Date.now()}`,
      email: `e2e_${Date.now()}@example.com`,
      fullName: 'E2E Test User',
      password: 'StrongPassword123!',
      role: 'ADMIN',
    };

    it('should register a new user', async () => {
      const response = await request(app.getHttpServer())
        .post('/users')
        .send(testUser)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body.username).toEqual(testUser.username);
      userId = response.body.id; // 🟢 Save the userId for later
    });

    it('should authenticate the user and return a JWT', async () => {
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
      await request(app.getHttpServer()).get('/projects').expect(401);
    });
  });

  describe('Phase 2: Core Domain (Projects & Tickets)', () => {
    it('should create a new Project', async () => {
      const response = await request(app.getHttpServer())
        .post('/projects')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          name: `E2E Project ${Date.now()}`,
          description: 'A test project for E2E validation',
          ownerId: userId, // 🟢 Added required ownerId
        })
        .expect(200);

      expect(response.body).toHaveProperty('id');
      projectId = response.body.id;
    });

    it('should create multiple Tickets assigned to that Project', async () => {
      const resA = await request(app.getHttpServer())
        .post('/tickets')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          title: 'Ticket A',
          description: 'Core functionality',
          projectId: projectId,
          type: 'FEATURE',
          priority: 'HIGH',
          status: 'TODO',
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
          status: 'TODO',
        })
        .expect(200);

      ticketBId = resB.body.id;
    });

    it('should reject backward status transitions per the state machine', async () => {
      // Step 1: Valid forward transition (TODO -> IN_PROGRESS)
      await request(app.getHttpServer())
        .patch(`/tickets/${ticketBId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ status: 'IN_PROGRESS' })
        .expect(200);

      // Step 2: Attempt illegal backward transition to TODO
      await request(app.getHttpServer())
        .patch(`/tickets/${ticketBId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ status: 'TODO' })
        .expect(400); // Expecting your state machine to reject the backward move
    });
  });

  describe('Phase 3: Complex Constraints (Dependencies)', () => {
    let ticketCId: number;

    it('should create a dependency relationship where Ticket A is blocked by Ticket C', async () => {
      const resC = await request(app.getHttpServer())
        .post('/tickets')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          title: 'Ticket C',
          description: 'Blocks Ticket A',
          projectId: projectId,
          type: 'TECHNICAL',
          priority: 'MEDIUM',
          status: 'TODO',
        })
        .expect(200);

      ticketCId = resC.body.id;

      await request(app.getHttpServer())
        .post(`/tickets/${ticketAId}/dependencies`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ blockedBy: ticketCId })
        .expect(200);
    });

    it('should reject transitioning Ticket A to DONE while blocked by an incomplete Ticket C', async () => {
      await request(app.getHttpServer())
        .patch(`/tickets/${ticketAId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ status: 'DONE' })
        .expect(400);
    });
  });

  describe('Phase 4: Concurrency (Optimistic Locking)', () => {
    it('should prevent concurrent updates via optimistic locking', async () => {
      // First, get the current version of the ticket
      const getRes = await request(app.getHttpServer())
        .get(`/tickets/${ticketAId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      // Capture the current VersionColumn state to simulate a race condition.
      // Both subsequent requests will attempt to patch the database using this stale version number.
      const currentVersion = getRes.body.version;

      const request1 = request(app.getHttpServer())
        .patch(`/tickets/${ticketAId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ description: 'Concurrent Race 1', version: currentVersion });

      const request2 = request(app.getHttpServer())
        .patch(`/tickets/${ticketAId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ description: 'Concurrent Race 2', version: currentVersion });

      const [response1, response2] = await Promise.all([request1, request2]);

      const statuses = [response1.status, response2.status].sort();

      // Expect exactly one success and one conflict
      expect(statuses[0]).toBe(200);
      expect(statuses[1]).toBe(409);
    });
  });

  describe('Phase 5: Comments & Mentions', () => {
    it('should add a comment to Ticket A with a user mention and parse it', async () => {
      // 1. Fetch the user's username
      const userRes = await request(app.getHttpServer())
        .get(`/users/${userId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      const username = userRes.body.username;

      // 2. Add a comment containing the @mention
      await request(app.getHttpServer())
        .post(`/tickets/${ticketAId}/comments`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          content: `Hey @${username}, please check this dependency!`,
          authorId: userId,
        })
        .expect(200);

      // 3. Verify the system parsed and saved the mention
      const mentionsRes = await request(app.getHttpServer())
        .get(`/users/${userId}/mentions`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      // 🟢 Fixed: Checking the body directly since your API returns a raw array
      expect(Array.isArray(mentionsRes.body)).toBe(true);
      const mention = mentionsRes.body.find((m: any) =>
        m.content.includes(`@${username}`),
      );
      expect(mention).toBeDefined();
      expect(mention.ticketId).toEqual(ticketAId);
    });
  });

  describe('Phase 6: Extended Features', () => {
    let newTicketId: number;

    it('should assign null when assigneeId is omitted and no DEVELOPER exists', async () => {
      const response = await request(app.getHttpServer())
        .post('/tickets')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          title: 'Auto-Assignment Fallback Test',
          description:
            'Testing workload distribution logic when no devs are available',
          projectId: projectId,
          type: 'BUG',
          priority: 'LOW',
          status: 'TODO',
        })
        .expect(200);

      expect(response.body).toHaveProperty('id');
      // 🟢 Fixed: We now correctly expect it to be null, proving your logic works
      expect(response.body.assigneeId).toBeNull();
      newTicketId = response.body.id;
    });

    it('should softly delete a ticket, verify it is missing, find it in deleted, and restore it', async () => {
      // Step 1: Execute a DELETE request. The system is designed to use soft-deletes (setting `isDeleted = true`)
      // rather than hard row drops to preserve historical data residency and audit trails.
      await request(app.getHttpServer())
        .delete(`/tickets/${newTicketId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      // Step 2: Ensure the default GET /tickets query automatically filters out soft-deleted records.
      const activeRes = await request(app.getHttpServer())
        .get(`/tickets`)
        .query({ projectId })
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      const isActive = activeRes.body.some((t: any) => t.id === newTicketId);
      expect(isActive).toBe(false);

      // 3. GET /tickets/deleted?projectId=X (SHOULD contain the deleted ticket)
      const deletedRes = await request(app.getHttpServer())
        .get(`/tickets/deleted`)
        .query({ projectId })
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      const isDeleted = deletedRes.body.some((t: any) => t.id === newTicketId);
      expect(isDeleted).toBe(true);

      // 4. POST /tickets/:id/restore to bring it back
      await request(app.getHttpServer())
        .post(`/tickets/${newTicketId}/restore`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);
    });

    it('should record actions in the audit logs', async () => {
      const auditRes = await request(app.getHttpServer())
        .get('/audit-logs')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(Array.isArray(auditRes.body)).toBe(true);

      const actions = auditRes.body.map((log: any) => log.action);
      expect(actions).toContain('CREATE');
      expect(actions).toContain('DELETE');
    });
  });
});
