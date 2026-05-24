import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, OptimisticLockVersionMismatchError } from 'typeorm';
import { Comment } from './entities/comment.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { User } from '../users/entities/user.entity';
import { TicketsService } from '../tickets/tickets.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    private readonly ticketsService: TicketsService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
  ) {}

  async findAllByTicket(ticketId: number): Promise<Comment[]> {
    await this.ticketsService.findOne(ticketId);
    const comments = await this.commentRepository.find({
      where: { ticketId },
      order: { createdAt: 'ASC' },
      relations: ['mentionedUsers'],
    });
    return comments.map((comment) => this.mapComment(comment));
  }

  async create(
    ticketId: number,
    createCommentDto: CreateCommentDto,
  ): Promise<Comment> {
    await this.ticketsService.findOne(ticketId);
    const mentionedUsers = await this.resolveMentionedUsers(
      createCommentDto.content,
    );

    const comment = this.commentRepository.create({
      ticketId,
      content: createCommentDto.content,
      authorId: createCommentDto.authorId,
      mentionedUsers,
    });

    const savedComment = await this.saveComment(comment);
    return this.mapComment(savedComment);
  }

  async update(
    ticketId: number,
    commentId: number,
    updateCommentDto: UpdateCommentDto,
  ): Promise<Comment> {
    await this.ticketsService.findOne(ticketId);
    const comment = await this.commentRepository.findOne({
      where: { id: commentId, ticketId },
      relations: ['mentionedUsers'],
    });

    if (!comment) {
      throw new NotFoundException(
        `Comment with ID ${commentId} for ticket ${ticketId} not found`,
      );
    }

    comment.content = updateCommentDto.content;
    comment.mentionedUsers = await this.resolveMentionedUsers(
      updateCommentDto.content,
    );

    const savedComment = await this.saveComment(comment);
    return this.mapComment(savedComment);
  }

  async remove(ticketId: number, commentId: number): Promise<void> {
    await this.ticketsService.findOne(ticketId);
    const comment = await this.commentRepository.findOne({
      where: { id: commentId, ticketId },
    });

    if (!comment) {
      throw new NotFoundException(
        `Comment with ID ${commentId} for ticket ${ticketId} not found`,
      );
    }

    await this.commentRepository.delete(commentId);
  }

  async findMentionsForUser(userId: number): Promise<Comment[]> {
    const comments = await this.commentRepository
      .createQueryBuilder('comment')
      .innerJoin('comment.mentionedUsers', 'user', 'user.id = :userId', { userId })
      .leftJoinAndSelect('comment.mentionedUsers', 'allUsers')
      .orderBy('comment.createdAt', 'DESC')
      .getMany();

    return comments.map((comment) => this.mapComment(comment));
  }

  private mapComment(comment: Comment): Comment {
    if (comment && comment.mentionedUsers) {
      comment.mentionedUsers = comment.mentionedUsers.map((user) => ({
        id: user.id,
        username: user.username,
        fullName: user.fullName,
      })) as User[];
    }
    return comment;
  }

  private async saveComment(comment: Comment): Promise<Comment> {
    try {
      const savedComment = await this.commentRepository.save(comment);
      return this.commentRepository.findOne({
        where: { id: savedComment.id },
        relations: ['mentionedUsers'],
      });
    } catch (error) {
      if (error instanceof OptimisticLockVersionMismatchError) {
        throw new ConflictException(
          'Comment update failed due to concurrent modification. Please reload and retry.',
        );
      }
      throw error;
    }
  }

  private extractMentionedUsernames(content: string): string[] {
    const matches = content.match(/@([a-z0-9_]+)/gi);
    if (!matches) {
      return [];
    }

    return Array.from(
      new Set(matches.map((mention) => mention.slice(1).toLowerCase())),
    );
  }

  private async resolveMentionedUsers(content: string): Promise<User[]> {
    const usernames = this.extractMentionedUsernames(content);
    if (!usernames.length) {
      return [];
    }

    return this.usersService.findUsersByUsernames(usernames);
  }
}
