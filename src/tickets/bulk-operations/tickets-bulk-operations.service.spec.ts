import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket } from '../entities/ticket.entity';
import { TicketsBulkOperationsService } from './tickets-bulk-operations.service';

describe('TicketsBulkOperationsService', () => {
  let service: TicketsBulkOperationsService;
  let repository: Partial<Repository<Ticket>>;

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsBulkOperationsService,
        {
          provide: getRepositoryToken(Ticket),
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get<TicketsBulkOperationsService>(
      TicketsBulkOperationsService,
    );
  });

  it('should parse complex CSV rows with commas and escaped quotes and create valid tickets', async () => {
    const csv =
      'title,description,status,priority,type,assigneeId\n' +
      'Complex ticket,"A field with, commas and ""escaped quotes""",TODO,HIGH,BUG,5\n';

    const savedTickets: any[] = [];

    (repository.create as jest.Mock).mockImplementation((payload) => payload);
    (repository.save as jest.Mock).mockImplementation(async (ticket) => {
      savedTickets.push(ticket);
      return ticket;
    });

    const result = await service.importTickets(42, Buffer.from(csv, 'utf8'));

    expect(result.created).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.errors).toHaveLength(0);
    expect(savedTickets).toHaveLength(1);
    expect(savedTickets[0]).toEqual(
      expect.objectContaining({
        projectId: 42,
        title: 'Complex ticket',
        description: 'A field with, commas and "escaped quotes"',
        status: 'TODO',
        priority: 'HIGH',
        type: 'BUG',
        assigneeId: 5,
      }),
    );
  });

  it('should continue processing rows when one row is invalid', async () => {
    const csv =
      'title,description,status,priority,type,assigneeId\n' +
      'Valid ticket,"Ok description",TODO,LOW,FEATURE,1\n' +
      'Bad ticket,"Missing status",INVALID,MEDIUM,BUG,2\n';

    const savedTickets: any[] = [];
    (repository.create as jest.Mock).mockImplementation((payload) => payload);
    (repository.save as jest.Mock).mockImplementation(async (ticket) => {
      savedTickets.push(ticket);
      return ticket;
    });

    const result = await service.importTickets(7, Buffer.from(csv, 'utf8'));

    expect(result.created).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.errors[0]).toContain('Row 3: Invalid status value');
    expect(savedTickets).toHaveLength(1);
    expect(savedTickets[0]).toMatchObject({
      title: 'Valid ticket',
      status: 'TODO',
      priority: 'LOW',
      type: 'FEATURE',
      assigneeId: 1,
    });
  });
});
