import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { Comment } from './entities/comment.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { OptimisticLockVersionMismatchError } from 'typeorm';
import { TicketsService } from '../tickets/tickets.service';
import { UsersService } from 'src/users/users.service';

describe('CommentsService', () => {
  let service: CommentsService;

  const mockCommentRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };

  const mockUsersService = {
    findUsersByUsernames: jest.fn(),
  };

  const mockTicketsService = {
    findOne: jest.fn(),
  };

  const sampleComment: Comment = {
    id: 1,
    content: 'Initial comment',
    authorId: 2,
    ticketId: 5,
    mentionedUsers: [],
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Comment;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        {
          provide: getRepositoryToken(Comment),
          useValue: mockCommentRepository,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: TicketsService,
          useValue: mockTicketsService,
        },
      ],
    }).compile();

    service = module.get<CommentsService>(CommentsService);
    mockTicketsService.findOne.mockResolvedValue({ id: 5, isDeleted: false });
    mockUsersService.findUsersByUsernames.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllByTicket', () => {
    it('should return all comments for a given ticket', async () => {
      mockCommentRepository.find.mockResolvedValue([sampleComment]);

      const result = await service.findAllByTicket(5);
      expect(result).toEqual([sampleComment]);
      expect(mockCommentRepository.find).toHaveBeenCalledWith({
        where: { ticketId: 5 },
        order: { createdAt: 'ASC' },
        relations: ['mentionedUsers'],
      });
    });
  });

  describe('create', () => {
    it('should create and save a new comment', async () => {
      const dto: CreateCommentDto = {
        content: 'New comment body',
        authorId: 2,
      };

      mockCommentRepository.create.mockReturnValue({
        ...sampleComment,
        content: dto.content,
        authorId: dto.authorId,
        ticketId: 5,
      });
      const savedComment = {
        ...sampleComment,
        content: dto.content,
        authorId: dto.authorId,
        ticketId: 5,
      };

      mockCommentRepository.save.mockResolvedValue(savedComment);
      mockCommentRepository.findOne.mockResolvedValue(savedComment);

      const result = await service.create(5, dto);
      expect(result.content).toBe(dto.content);
      expect(mockCommentRepository.create).toHaveBeenCalledWith({
        ticketId: 5,
        content: dto.content,
        authorId: dto.authorId,
        mentionedUsers: [],
      });
    });
  });

  describe('update', () => {
    it('should update an existing comment', async () => {
      const dto: UpdateCommentDto = { content: 'Updated body' };
      mockCommentRepository.findOne.mockResolvedValue(sampleComment);
      const savedComment = {
        ...sampleComment,
        content: dto.content,
      };

      mockCommentRepository.save.mockResolvedValue(savedComment);
      mockCommentRepository.findOne.mockResolvedValue(savedComment);

      const result = await service.update(5, 1, dto);
      expect(result.content).toBe(dto.content);
      expect(mockCommentRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          content: dto.content,
        }),
      );
    });

    it('should throw NotFoundException when comment does not exist', async () => {
      mockCommentRepository.findOne.mockResolvedValue(undefined);

      await expect(service.update(5, 99, { content: 'x' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException on optimistic lock version mismatch', async () => {
      const dto: UpdateCommentDto = { content: 'Conflict update' };
      mockCommentRepository.findOne.mockResolvedValue(sampleComment);
      mockCommentRepository.save.mockRejectedValue(
        new OptimisticLockVersionMismatchError('Comment', 1, 2),
      );

      await expect(service.update(5, 1, dto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockCommentRepository.save).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete an existing comment', async () => {
      mockCommentRepository.findOne.mockResolvedValue(sampleComment);
      mockCommentRepository.delete.mockResolvedValue({ affected: 1 });

      await service.remove(5, 1);
      expect(mockCommentRepository.delete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when deleting a missing comment', async () => {
      mockCommentRepository.findOne.mockResolvedValue(undefined);

      await expect(service.remove(5, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('mention extraction', () => {
    it('should resolve existing @mentions and attach mentionedUsers', async () => {
      const dto: CreateCommentDto = {
        content: 'Hey @alice and @BOB, please review',
        authorId: 2,
      };

      const resolvedUsers = [
        { id: 3, username: 'alice', fullName: 'Alice' },
        { id: 4, username: 'bob', fullName: 'Bob' },
      ] as any[];

      mockUsersService.findUsersByUsernames.mockResolvedValue(resolvedUsers);
      mockCommentRepository.create.mockReturnValue({
        ...sampleComment,
        content: dto.content,
        authorId: dto.authorId,
        ticketId: 5,
        mentionedUsers: resolvedUsers,
      });
      mockCommentRepository.save.mockResolvedValue({
        ...sampleComment,
        content: dto.content,
        mentionedUsers: resolvedUsers,
      });
      mockCommentRepository.findOne.mockResolvedValue({
        ...sampleComment,
        content: dto.content,
        mentionedUsers: resolvedUsers,
      });

      const result = await service.create(5, dto);
      expect(result.mentionedUsers).toEqual(resolvedUsers);
      expect(mockUsersService.findUsersByUsernames).toHaveBeenCalledWith([
        'alice',
        'bob',
      ]);
    });
  });

  describe('Deleted ticket checks', () => {
    beforeEach(() => {
      mockTicketsService.findOne.mockRejectedValue(
        new NotFoundException('Ticket not found'),
      );
    });

    it('should block fetching comments if the parent ticket is deleted', async () => {
      await expect(service.findAllByTicket(5)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should block creating a comment if the parent ticket is deleted', async () => {
      await expect(
        service.create(5, { content: 'hello', authorId: 1 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should block updating a comment if the parent ticket is deleted', async () => {
      await expect(service.update(5, 1, { content: 'hello' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should block deleting a comment if the parent ticket is deleted', async () => {
      await expect(service.remove(5, 1)).rejects.toThrow(NotFoundException);
    });
  });
});
