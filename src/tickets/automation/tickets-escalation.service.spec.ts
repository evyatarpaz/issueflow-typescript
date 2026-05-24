import { Test, TestingModule } from '@nestjs/testing';
import { TicketsCronService } from './tickets-escalation.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Ticket, TicketPriority } from '../entities/ticket.entity';

describe('TicketsCronService', () => {
  let service: TicketsCronService;
  let mockTicketRepository: any;

  beforeEach(async () => {
    mockTicketRepository = {
      createQueryBuilder: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      save: jest.fn().mockImplementation((ticket) => Promise.resolve(ticket)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsCronService,
        {
          provide: getRepositoryToken(Ticket),
          useValue: mockTicketRepository,
        },
      ],
    }).compile();

    service = module.get<TicketsCronService>(TicketsCronService);
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-01T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should increment priority by exactly ONE step per cycle (LOW -> MEDIUM)', async () => {
    const overdueTicket = {
      id: 1,
      priority: TicketPriority.LOW,
      dueDate: new Date('2026-05-01T12:00:00Z'),
      isOverdue: false,
      isDeleted: false,
    } as Ticket;

    mockTicketRepository.getMany.mockResolvedValue([overdueTicket]);

    await service.handleAutoEscalation();

    expect(overdueTicket.priority).toBe(TicketPriority.MEDIUM);
    expect(overdueTicket.isOverdue).toBe(false); // Does not become true until CRITICAL
    expect(mockTicketRepository.save).toHaveBeenCalledWith(overdueTicket);
  });

  it('should increment priority by exactly ONE step per cycle (MEDIUM -> HIGH)', async () => {
    const overdueTicket = {
      id: 2,
      priority: TicketPriority.MEDIUM,
      dueDate: new Date('2026-05-01T12:00:00Z'),
      isOverdue: false,
      isDeleted: false,
    } as Ticket;

    mockTicketRepository.getMany.mockResolvedValue([overdueTicket]);

    await service.handleAutoEscalation();

    expect(overdueTicket.priority).toBe(TicketPriority.HIGH);
    expect(overdueTicket.isOverdue).toBe(false);
    expect(mockTicketRepository.save).toHaveBeenCalledWith(overdueTicket);
  });

  it('should prove idempotency: a CRITICAL ticket does not escalate further, but isOverdue becomes true', async () => {
    const criticalTicket = {
      id: 3,
      priority: TicketPriority.CRITICAL,
      dueDate: new Date('2026-05-01T12:00:00Z'),
      isOverdue: false,
      isDeleted: false,
    } as Ticket;

    mockTicketRepository.getMany.mockResolvedValue([criticalTicket]);

    await service.handleAutoEscalation();

    expect(criticalTicket.priority).toBe(TicketPriority.CRITICAL);
    expect(criticalTicket.isOverdue).toBe(true);
    expect(mockTicketRepository.save).toHaveBeenCalledWith(criticalTicket);
  });
});
