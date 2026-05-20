import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditLogsController } from './audit-logs.controller';
import { AuditLogsService } from './audit-logs.service';
import {
  AuditLog,
  AuditAction,
  AuditActor,
  AuditEntityType,
} from './audit-log.entity';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants';

describe('AuditLogsController', () => {
  let controller: AuditLogsController;
  let service: AuditLogsService;

  const mockAuditLogsService = {
    findAll: jest.fn(),
  };

  const sampleLog = {
    id: 1,
    action: AuditAction.CREATE,
    entityType: AuditEntityType.TICKET,
    entityId: 5,
    performedBy: 0,
    actor: AuditActor.SYSTEM,
    timestamp: new Date(),
  } as unknown as AuditLog;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditLogsController],
      providers: [
        {
          provide: AuditLogsService,
          useValue: mockAuditLogsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuditLogsController>(AuditLogsController);
    service = module.get<AuditLogsService>(AuditLogsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return audit logs filtered by query', async () => {
    mockAuditLogsService.findAll.mockResolvedValue([sampleLog]);

    const result = await controller.findAll({
      entityType: AuditEntityType.TICKET,
    });

    expect(result).toEqual([sampleLog]);
    expect(service.findAll).toHaveBeenCalledWith({
      entityType: AuditEntityType.TICKET,
    });
  });

  it('should use HTTP 200 for the findAll endpoint', () => {
    expect(
      Reflect.getMetadata(
        HTTP_CODE_METADATA,
        AuditLogsController.prototype.findAll,
      ),
    ).toBe(200);
  });
});
