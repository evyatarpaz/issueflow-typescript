import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { OptimisticLockVersionMismatchError } from 'typeorm';

import {
  AuditAction,
  AuditActor,
  AuditEntityType,
} from '../audit-logs/entities/audit-log.entity';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  Ticket,
  TicketStatus,
  TicketPriority,
  TicketType,
} from './entities/ticket.entity';
import { User } from '../users/entities/user.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';

/**
 * Test suite for the TicketsService.
 * Validates complex behaviors such as the auto-assignment heuristic, DAG dependency rules,
 * linear state machine transitions, and optimistic locking conflict handling.
 */
describe('TicketsService', () => {
  let service: TicketsService;

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  const mockAuditLogsService = {
    logAction: jest.fn(),
  };

  const mockTicketRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  const mockUserQueryBuilder = {
    innerJoin: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([]),
  };

  const mockUserRepository = {
    createQueryBuilder: jest.fn().mockReturnValue(mockUserQueryBuilder),
  };

  const sampleTicket = {
    id: 1,
    title: 'Test Ticket',
    description: 'Test Description',
    status: TicketStatus.TODO,
    priority: TicketPriority.MEDIUM,
    type: TicketType.BUG,
    projectId: 1,
    assigneeId: null,
    dueDate: null,
    isOverdue: false,
    isDeleted: false,
    deletedAt: null,
    version: 1,
  } as unknown as Ticket;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        {
          provide: getRepositoryToken(Ticket),
          useValue: mockTicketRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: AuditLogsService,
          useValue: mockAuditLogsService,
        },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should successfully create a ticket', async () => {
      const dto: CreateTicketDto = {
        title: 'New Bug',
        type: TicketType.BUG,
        projectId: 1,
        description: 'Optional details',
        priority: TicketPriority.HIGH,
      };

      mockTicketRepository.create.mockReturnValue({ ...sampleTicket, ...dto });
      mockTicketRepository.save.mockResolvedValue({ ...sampleTicket, ...dto });

      const result = await service.create(dto);
      expect(result.title).toBe('New Bug');
      expect(mockTicketRepository.create).toHaveBeenCalledWith({
        ...dto,
        status: TicketStatus.TODO,
        isOverdue: false,
        isDeleted: false,
        deletedAt: null,
        assigneeId: null,
        dueDate: null,
      });
      expect(mockAuditLogsService.logAction).toHaveBeenCalledWith(
        AuditAction.CREATE,
        AuditEntityType.TICKET,
        sampleTicket.id,
        0,
        AuditActor.USER,
      );
    });

    it('should bypass auto-assignment if assigneeId is explicitly provided', async () => {
      const dto: CreateTicketDto = {
        title: 'Explicit Assign',
        type: TicketType.BUG,
        projectId: 1,
        description: 'No auto assign',
        priority: TicketPriority.HIGH,
        assigneeId: 99,
      };

      mockTicketRepository.create.mockReturnValue({ ...sampleTicket, ...dto });
      mockTicketRepository.save.mockResolvedValue({ ...sampleTicket, ...dto });

      const result = await service.create(dto);

      expect(result.assigneeId).toBe(99);
      expect(mockUserQueryBuilder.getRawMany).not.toHaveBeenCalled();
    });

    it('should auto-assign ticket to developer with lowest workload (0 tickets)', async () => {
      const dto: CreateTicketDto = {
        title: 'Auto Assign Bug',
        type: TicketType.BUG,
        projectId: 1,
        description: 'Need assignment',
        priority: TicketPriority.HIGH,
      };

      const devWith2 = { userId: 2, createdAt: new Date('2020-01-01') };
      const devWith0 = { userId: 3, createdAt: new Date('2021-01-01') };

      mockUserQueryBuilder.getRawMany.mockResolvedValueOnce([
        devWith0,
        devWith2,
      ]);

      mockTicketRepository.create.mockReturnValue({
        ...sampleTicket,
        ...dto,
        assigneeId: devWith0.userId,
      });
      mockTicketRepository.save.mockResolvedValue({
        ...sampleTicket,
        ...dto,
        assigneeId: devWith0.userId,
      });

      const result = await service.create(dto);

      expect(result.assigneeId).toBe(devWith0.userId);
      expect(mockAuditLogsService.logAction).toHaveBeenCalledWith(
        AuditAction.AUTO_ASSIGN,
        AuditEntityType.TICKET,
        sampleTicket.id,
        0,
        AuditActor.SYSTEM,
      );
    });
  });

  describe('update', () => {
    it('should clear isOverdue when priority is manually changed', async () => {
      const ticket = {
        ...sampleTicket,
        priority: TicketPriority.MEDIUM,
        isOverdue: true,
      } as Ticket;
      mockTicketRepository.findOne.mockResolvedValue(ticket);
      mockTicketRepository.save.mockImplementation((t) => Promise.resolve(t));

      const result = await service.update(1, {
        priority: TicketPriority.HIGH,
      });

      expect(result.priority).toBe(TicketPriority.HIGH);
      expect(result.isOverdue).toBe(false);
      expect(mockTicketRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: TicketPriority.HIGH,
          isOverdue: false,
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return active tickets for a specific project', async () => {
      mockTicketRepository.find.mockResolvedValue([sampleTicket]);
      mockQueryBuilder.getMany.mockResolvedValue([sampleTicket]);

      const result = await service.findAll(1);
      expect(result).toHaveLength(1);
    });
  });

  describe('Status Transitions & Guardrails', () => {
    it('should allow valid forward status transitions', async () => {
      const ticket = { ...sampleTicket, status: TicketStatus.TODO } as Ticket;
      mockTicketRepository.findOne.mockResolvedValue(ticket);
      mockTicketRepository.save.mockResolvedValue({
        ...ticket,
        status: TicketStatus.IN_PROGRESS,
      });

      const result = await service.update(1, {
        status: TicketStatus.IN_PROGRESS,
      });
      expect(result.status).toBe(TicketStatus.IN_PROGRESS);
    });

    it('should reject backward status transitions with BadRequestException', async () => {
      const ticket = {
        ...sampleTicket,
        status: TicketStatus.IN_REVIEW,
      } as Ticket;
      mockTicketRepository.findOne.mockResolvedValue(ticket);

      await expect(
        service.update(1, { status: TicketStatus.IN_PROGRESS }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should explicitly block modifications if the ticket status is already DONE', async () => {
      const ticket = { ...sampleTicket, status: TicketStatus.DONE } as Ticket;
      mockTicketRepository.findOne.mockResolvedValue(ticket);

      await expect(
        service.update(1, { title: 'Trying to change title' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject transition to DONE when there is an unresolved blocker', async () => {
      const blocker = {
        ...sampleTicket,
        id: 2,
        status: TicketStatus.IN_PROGRESS,
        projectId: 1,
      } as Ticket;

      const ticket = {
        ...sampleTicket,
        id: 1,
        status: TicketStatus.IN_REVIEW,
        blockedBy: [blocker],
      } as Ticket;

      mockTicketRepository.findOne.mockResolvedValueOnce(ticket);

      await expect(
        service.update(1, { status: TicketStatus.DONE }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Optimistic Locking (Concurrency Control)', () => {
    it('should fail gracefully when a concurrent version mismatch occurs', async () => {
      const ticket = { ...sampleTicket, status: TicketStatus.TODO } as Ticket;
      mockTicketRepository.findOne.mockResolvedValue(ticket);

      const lockingError = new OptimisticLockVersionMismatchError(
        'Ticket',
        1,
        2,
      );

      mockTicketRepository.save.mockRejectedValue(lockingError);

      await expect(
        service.update(1, { title: 'Concurrent Edit' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Soft Deletion', () => {
    it('should perform a soft-delete by setting flags and log timestamps', async () => {
      mockTicketRepository.findOne.mockResolvedValue(sampleTicket);
      mockTicketRepository.save.mockResolvedValue({
        ...sampleTicket,
        isDeleted: true,
      });

      await service.remove(1);
      expect(mockTicketRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          isDeleted: true,
          deletedAt: expect.any(Date),
        }),
      );
    });
  });
});
