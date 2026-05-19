import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let server: any;
  const userPrefix = `e2e-${Date.now()}`;
  const user = {
    username: `${userPrefix}-user`,
    email: `${userPrefix}@example.com`,
    fullName: 'E2E User',
    password: 'Password123!',
    role: 'DEVELOPER',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should register a new user and return a signed JWT for valid credentials', async () => {
    const created = await request(server).post('/users').send(user).expect(201);

    expect(created.body).toHaveProperty('id');
    expect(created.body).toMatchObject({
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    });
    expect(created.body).not.toHaveProperty('password');

    const loginResponse = await request(server)
      .post('/auth/login')
      .send({ username: user.username, password: user.password })
      .expect(201);

    expect(loginResponse.body).toHaveProperty('accessToken');
    expect(typeof loginResponse.body.accessToken).toBe('string');
    expect(loginResponse.body.accessToken.split('.').length).toBe(3);

    const profileResponse = await request(server)
      .get('/auth/me')
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
      .expect(200);

    expect(profileResponse.body).toMatchObject({
      id: created.body.id,
      username: user.username,
      role: user.role,
    });
  });

  it('should return 401 Unauthorized for invalid credentials', async () => {
    await request(server)
      .post('/auth/login')
      .send({ username: user.username, password: 'wrong-password' })
      .expect(401);
  });

  it('should block unauthenticated requests to protected routes', async () => {
    await request(server).get('/auth/me').expect(401);
  });
});
