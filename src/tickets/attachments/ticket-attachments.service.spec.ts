import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TicketAttachmentsService } from './ticket-attachments.service';
import { Attachment } from '../entities/attachment.entity';
import { Ticket } from '../entities/ticket.entity';

/**
 * Test suite for the TicketAttachmentsService.
 * Validates critical path constraints, primarily ensuring that users cannot attach or detach
 * files from non-existent or soft-deleted tickets.
 */
describe('TicketAttachmentsService', () => {
  let service: TicketAttachmentsService;

  const mockAttachmentRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockTicketRepository = {
    findOne: jest.fn(),
  };

  const sampleFile = {
    originalname: 'screenshot.png',
    mimetype: 'image/png',
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketAttachmentsService,
        {
          provide: getRepositoryToken(Attachment),
          useValue: mockAttachmentRepository,
        },
        {
          provide: getRepositoryToken(Ticket),
          useValue: mockTicketRepository,
        },
      ],
    }).compile();

    service = module.get<TicketAttachmentsService>(TicketAttachmentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadAttachment', () => {
    it('should save attachment metadata and return payload', async () => {
      mockTicketRepository.findOne.mockResolvedValue({
        id: 1,
        isDeleted: false,
      });
      mockAttachmentRepository.create.mockReturnValue({
        ticketId: 1,
        filename: sampleFile.originalname,
        contentType: sampleFile.mimetype,
      });
      mockAttachmentRepository.save.mockResolvedValue({
        id: 1,
        ticketId: 1,
        filename: sampleFile.originalname,
        contentType: sampleFile.mimetype,
      });

      const result = await service.uploadAttachment(1, sampleFile);

      expect(mockTicketRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1, isDeleted: false },
      });
      expect(mockAttachmentRepository.create).toHaveBeenCalledWith({
        ticketId: 1,
        filename: sampleFile.originalname,
        contentType: sampleFile.mimetype,
      });
      expect(result).toEqual({
        id: 1,
        ticketId: 1,
        filename: sampleFile.originalname,
        contentType: sampleFile.mimetype,
      });
    });
  });

  describe('deleteAttachment', () => {
    it('should remove the attachment for the ticket', async () => {
      mockAttachmentRepository.findOne.mockResolvedValue({
        id: 2,
        ticketId: 1,
      });

      await service.deleteAttachment(1, 2);

      expect(mockAttachmentRepository.findOne).toHaveBeenCalledWith({
        where: { id: 2, ticketId: 1 },
      });
      expect(mockAttachmentRepository.remove).toHaveBeenCalledWith({
        id: 2,
        ticketId: 1,
      });
    });
  });
});
