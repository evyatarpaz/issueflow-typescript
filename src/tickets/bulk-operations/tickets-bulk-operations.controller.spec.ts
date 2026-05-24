import { Test, TestingModule } from '@nestjs/testing';
import { StreamableFile } from '@nestjs/common';
import { Readable } from 'stream';
import { TicketsBulkOperationsController } from './tickets-bulk-operations.controller';
import { TicketsBulkOperationsService } from './tickets-bulk-operations.service';

describe('TicketsBulkOperationsController', () => {
  let controller: TicketsBulkOperationsController;
  let service: Partial<TicketsBulkOperationsService>;

  beforeEach(async () => {
    service = {
      exportTickets: jest.fn(),
      importTickets: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TicketsBulkOperationsController],
      providers: [
        {
          provide: TicketsBulkOperationsService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<TicketsBulkOperationsController>(
      TicketsBulkOperationsController,
    );
  });

  it('should return a StreamableFile from exportTickets', async () => {
    const readable = new Readable();
    (service.exportTickets as jest.Mock).mockResolvedValue(readable);

    const result = await controller.exportTickets({ projectId: 11 } as any);

    expect(result).toBeInstanceOf(StreamableFile);
  });

  it('should pass import request through to the service', async () => {
    const expected = { created: 0, failed: 0, errors: [] };
    (service.importTickets as jest.Mock).mockResolvedValue(expected);

    const file: any = {
      buffer: Buffer.from('title,status,priority,type,assigneeId\n', 'utf8'),
    };

    const result = await controller.importTickets(
      { projectId: 3 } as any,
      file,
    );

    expect(result).toEqual(expected);
    expect(service.importTickets).toHaveBeenCalledWith(3, file.buffer);
  });
});
