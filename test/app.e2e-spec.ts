import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './../src/app.module';

/**
 * Fundamental sanity checks for the NestJS IoC container.
 * Runs before deeper integration tests to guarantee that the application can bootstrap
 * and establish critical infrastructure connections (e.g., database) without crashing.
 */
describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should successfully bootstrap the application and connect to the database', () => {
    expect(app).toBeDefined();
  });
});
