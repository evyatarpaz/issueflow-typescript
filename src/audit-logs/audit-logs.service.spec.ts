import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditLogsService } from './audit-logs.service';
import {
  AuditLog,
  AuditAction,
  AuditActor,
  AuditEntityType,
} from './audit-log.entity';
import { FindAuditLogDto } from './dto/find-audit-log.dto';

describe('AuditLogsService', () => {
  let service: AuditLogsService;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  const sampleLogEntry = {
    id: 1,
    action: AuditAction.CREATE,
    entityType: AuditEntityType.TICKET,
    entityId: 10,
    performedBy: 0,
    actor: AuditActor.SYSTEM,
    timestamp: new Date(),
  } as unknown as AuditLog;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogsService,
        {
          provide: getRepositoryToken(AuditLog),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<AuditLogsService>(AuditLogsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('logAction', () => {
    it('should create and save an audit log entry', async () => {
      mockRepository.create.mockReturnValue(sampleLogEntry);
      mockRepository.save.mockResolvedValue(sampleLogEntry);

      const result = await service.logAction(
        AuditAction.CREATE,
        AuditEntityType.TICKET,
        10,
        0,
        AuditActor.SYSTEM,
      );

      expect(mockRepository.create).toHaveBeenCalledWith({
        action: AuditAction.CREATE,
        entityType: AuditEntityType.TICKET,
        entityId: 10,
        performedBy: 0,
        actor: AuditActor.SYSTEM,
      });
      expect(mockRepository.save).toHaveBeenCalledWith(sampleLogEntry);
      expect(result).toBe(sampleLogEntry);
    });
  });

  describe('findAll', () => {
    it('should return matching audit log entries using optional filters', async () => {
      const query: FindAuditLogDto = {
        action: AuditAction.CREATE,
        entityType: AuditEntityType.TICKET,
      };

      mockRepository.find.mockResolvedValue([sampleLogEntry]);

      const result = await service.findAll(query);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {
          action: AuditAction.CREATE,
          entityType: AuditEntityType.TICKET,
        },
        order: { timestamp: 'DESC' },
      });
      expect(result).toEqual([sampleLogEntry]);
    });
  });
});
