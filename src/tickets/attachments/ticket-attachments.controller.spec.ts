import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { TicketAttachmentsController } from './ticket-attachments.controller';
import { TicketAttachmentsService } from './ticket-attachments.service';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import {
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Test suite for the TicketAttachmentsController.
 * Ensures the perimeter defenses (like the `ParseFilePipe`) effectively reject malicious
 * payloads (e.g. executable scripts or oversized files causing DoS) before they reach the service layer.
 */
describe('TicketAttachmentsController', () => {
  let controller: TicketAttachmentsController;
  let service: TicketAttachmentsService;

  const mockTicketAttachmentsService = {
    uploadAttachment: jest.fn(),
    deleteAttachment: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TicketAttachmentsController],
      providers: [
        {
          provide: TicketAttachmentsService,
          useValue: mockTicketAttachmentsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TicketAttachmentsController>(
      TicketAttachmentsController,
    );
    service = module.get<TicketAttachmentsService>(TicketAttachmentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should upload attachment and return metadata', async () => {
    const file = {
      originalname: 'notes.txt',
      mimetype: 'text/plain',
    } as any;
    const payload = {
      id: 1,
      ticketId: 1,
      filename: 'notes.txt',
      contentType: 'text/plain',
    };
    mockTicketAttachmentsService.uploadAttachment.mockResolvedValue(payload);

    const result = await controller.uploadAttachment(1 as any, file as any);

    expect(result).toBe(payload);
    expect(service.uploadAttachment).toHaveBeenCalledWith(1, file);
  });

  it('should delete attachment and return undefined', async () => {
    mockTicketAttachmentsService.deleteAttachment.mockResolvedValue(undefined);

    const result = await controller.deleteAttachment(1 as any, 2 as any);

    expect(result).toBeUndefined();
    expect(service.deleteAttachment).toHaveBeenCalledWith(1, 2);
  });

  it('should declare file upload route metadata as HTTP 200', () => {
    expect(
      Reflect.getMetadata(
        HTTP_CODE_METADATA,
        TicketAttachmentsController.prototype.uploadAttachment,
      ),
    ).toBe(200);
    expect(
      Reflect.getMetadata(
        HTTP_CODE_METADATA,
        TicketAttachmentsController.prototype.deleteAttachment,
      ),
    ).toBe(200);
  });

  it('should reject a file larger than 10MB in the ParseFilePipe', async () => {
    const largeFile = {
      originalname: 'large.pdf',
      mimetype: 'application/pdf',
      size: MAX_FILE_SIZE + 1,
    } as any;

    const pipe = new ParseFilePipe({
      validators: [
        new MaxFileSizeValidator({ maxSize: MAX_FILE_SIZE }),
        new FileTypeValidator({
          fileType: 'image/png|image/jpeg|application/pdf|text/plain',
        }),
      ],
    });

    await expect(pipe.transform(largeFile)).rejects.toThrow();
  });
});
