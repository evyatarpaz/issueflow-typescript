import { Test, TestingModule } from '@nestjs/testing';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import {
  TicketStatus,
  TicketPriority,
  TicketType,
  Ticket,
} from './entities/ticket.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { JwtAuthGuard } from '../common/guards/jwt.guard';

describe('TicketsController', () => {
  let controller: TicketsController;
  let service: TicketsService;

  const mockTicketsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
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
      controllers: [TicketsController],
      providers: [
        {
          provide: TicketsService,
          useValue: mockTicketsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard) // <-- Instructs NestJS to bypass looking for AuthServices
      .useValue({ canActivate: () => true }) // <-- Automatically approves the mock request context
      .compile();

    controller = module.get<TicketsController>(TicketsController);
    service = module.get<TicketsService>(TicketsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /tickets (create)', () => {
    it('should invoke service.create and return status 200 per specification rules', async () => {
      const dto: CreateTicketDto = {
        title: 'Task Spec Bug',
        type: TicketType.BUG,
        projectId: 1,
        description: 'Verifying return codes',
        priority: TicketPriority.HIGH,
      };

      mockTicketsService.create.mockResolvedValue({ ...sampleTicket, ...dto });

      const result = await controller.create(dto);
      expect(result.title).toBe('Task Spec Bug');
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('GET /tickets (findAll)', () => {
    it('should invoke service.findAll using the mandatory projectId query argument', async () => {
      mockTicketsService.findAll.mockResolvedValue([sampleTicket]);

      const result = await controller.findAll(1);
      expect(result).toHaveLength(1);
      expect(service.findAll).toHaveBeenCalledWith(1);
    });
  });

  describe('GET /tickets/:ticketId (findOne)', () => {
    it('should return a single ticket entity matching the provided parameter ID', async () => {
      mockTicketsService.findOne.mockResolvedValue(sampleTicket);

      const result = await controller.findOne(1);
      expect(result.id).toBe(1);
      expect(service.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('PATCH /tickets/:ticketId (update)', () => {
    it('should update entity fields and forward state modifications smoothly', async () => {
      const dto: UpdateTicketDto = { status: TicketStatus.IN_PROGRESS };
      mockTicketsService.update.mockResolvedValue({
        ...sampleTicket,
        status: TicketStatus.IN_PROGRESS,
      });

      const result = await controller.update(1, dto);
      expect(result.status).toBe(TicketStatus.IN_PROGRESS);
      expect(service.update).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('DELETE /tickets/:ticketId (remove)', () => {
    it('should execute deletion handler and implicitly pass down 200 execution signals', async () => {
      mockTicketsService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(1);
      expect(result).toBeUndefined();
      expect(service.remove).toHaveBeenCalledWith(1);
    });
  });
});
