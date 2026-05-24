import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants';

describe('CommentsController', () => {
  let controller: CommentsController;
  let service: CommentsService;

  const mockCommentsService = {
    findAllByTicket: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const sampleComment = {
    id: 1,
    content: 'Sample comment',
    authorId: 2,
    ticketId: 5,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommentsController],
      providers: [
        {
          provide: CommentsService,
          useValue: mockCommentsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CommentsController>(CommentsController);
    service = module.get<CommentsService>(CommentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAllByTicket', () => {
    it('should return comments for a ticket', async () => {
      mockCommentsService.findAllByTicket.mockResolvedValue([sampleComment]);

      const result = await controller.findAllByTicket(5);
      expect(result).toEqual([sampleComment]);
      expect(service.findAllByTicket).toHaveBeenCalledWith(5);
    });
  });

  describe('create', () => {
    it('should create a comment under the ticket', async () => {
      const dto: CreateCommentDto = {
        content: 'Test comment',
        authorId: 2,
      };

      mockCommentsService.create.mockResolvedValue({
        ...sampleComment,
        content: dto.content,
      });

      const result = await controller.create(5, dto);
      expect(result.content).toBe(dto.content);
      expect(service.create).toHaveBeenCalledWith(5, dto);
    });
  });

  describe('update', () => {
    it('should update comment content', async () => {
      const dto: UpdateCommentDto = { content: 'Updated content' };
      mockCommentsService.update.mockResolvedValue({
        ...sampleComment,
        content: dto.content,
      });

      const result = await controller.update(5, 1, dto);
      expect(result.content).toBe(dto.content);
      expect(service.update).toHaveBeenCalledWith(5, 1, dto);
    });
  });

  describe('remove', () => {
    it('should remove a comment successfully', async () => {
      mockCommentsService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(5, 1);
      expect(result).toBeUndefined();
      expect(service.remove).toHaveBeenCalledWith(5, 1);
    });
  });

  describe('HTTP status metadata', () => {
    it('should use HTTP 200 for all endpoints', () => {
      expect(
        Reflect.getMetadata(
          HTTP_CODE_METADATA,
          CommentsController.prototype.findAllByTicket,
        ),
      ).toBe(200);
      expect(
        Reflect.getMetadata(
          HTTP_CODE_METADATA,
          CommentsController.prototype.create,
        ),
      ).toBe(200);
      expect(
        Reflect.getMetadata(
          HTTP_CODE_METADATA,
          CommentsController.prototype.update,
        ),
      ).toBe(200);
      expect(
        Reflect.getMetadata(
          HTTP_CODE_METADATA,
          CommentsController.prototype.remove,
        ),
      ).toBe(200);
    });
  });
});
