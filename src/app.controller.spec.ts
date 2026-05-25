import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

/**
 * Unit test for the root application controller.
 * Verifies the liveness probe endpoint without needing to instantiate the entire
 * PostgreSQL connection pool or load deeply nested domain modules.
 */
describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "IssueFlow is running!"', () => {
      expect(appController.getHello()).toBe('IssueFlow is running!');
    });
  });
});
