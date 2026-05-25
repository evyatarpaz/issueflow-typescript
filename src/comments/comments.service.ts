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

/**
 * Orchestrates the lifecycle of Comments within the context of Tickets.
 * Responsible for mention parsing, ensuring referential integrity with Tickets,
 * and handling concurrent modification failures.
 */
@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    private readonly ticketsService: TicketsService,
    // We utilize forwardRef to resolve circular dependency between Users and Comments,
    // as Users module might need to fetch a user's authored comments.
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
  ) {}

  /**
   * Retrieves all conversational history for a specific ticket.
   *
   * @param ticketId - The ID of the parent ticket.
   * @returns A promise resolving to an array of mapped Comments.
   * @throws NotFoundException if the parent ticket does not exist or was deleted.
   */
  async findAllByTicket(ticketId: number): Promise<Comment[]> {
    // We mandate verifying the ticket's existence first to prevent returning
    // empty arrays for non-existent tickets, ensuring correct API semantics (404 vs 200).
    await this.ticketsService.findOne(ticketId);

    const comments = await this.commentRepository.find({
      where: { ticketId },
      order: { createdAt: 'ASC' },
      relations: ['mentionedUsers'],
    });
    return comments.map((comment) => this.mapComment(comment));
  }

  /**
   * Appends a new comment to a ticket and resolves @mentions.
   *
   * @param ticketId - The parent ticket ID.
   * @param createCommentDto - The validated payload containing the raw text.
   * @returns A promise resolving to the fully mapped saved Comment.
   */
  async create(
    ticketId: number,
    createCommentDto: CreateCommentDto,
  ): Promise<Comment> {
    await this.ticketsService.findOne(ticketId);

    // We extract and resolve mentions synchronously during creation to ensure the
    // comment entity is immediately aware of its relations for notification triggers downstream.
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

  /**
   * Mutates an existing comment, applying optimistic locking checks.
   *
   * @param ticketId - The parent ticket ID.
   * @param commentId - The ID of the comment to alter.
   * @param updateCommentDto - The new payload content.
   * @returns A promise resolving to the mapped updated Comment.
   */
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

    // We re-evaluate mentions on every update because the user might have
    // added new aliases or removed existing ones during their edit.
    comment.mentionedUsers = await this.resolveMentionedUsers(
      updateCommentDto.content,
    );

    const savedComment = await this.saveComment(comment);
    return this.mapComment(savedComment);
  }

  /**
   * Completely purges a comment from the system.
   *
   * @param ticketId - The parent ticket ID.
   * @param commentId - The target comment ID.
   */
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

  /**
   * Queries all comments across the system where a specific user is mentioned.
   * Primarily used for 'My Notifications' style dashboard widgets.
   *
   * @param userId - The ID of the user to find mentions for.
   * @returns A promise resolving to an array of mapped Comments.
   */
  async findMentionsForUser(userId: number): Promise<Comment[]> {
    // We use the query builder to efficiently filter based on the many-to-many join table,
    // avoiding pulling all comments into memory to filter them downstream.
    const comments = await this.commentRepository
      .createQueryBuilder('comment')
      .innerJoin('comment.mentionedUsers', 'user', 'user.id = :userId', {
        userId,
      })
      .leftJoinAndSelect('comment.mentionedUsers', 'allUsers')
      .orderBy('comment.createdAt', 'DESC')
      .getMany();

    return comments.map((comment) => this.mapComment(comment));
  }

  /**
   * Sanitizes the output entity to prevent leaking sensitive user data
   * (like password hashes or internal roles) through the mentionedUsers relation.
   */
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

  /**
   * Centralized persistence method executing the TypeORM save operation
   * wrapped with explicit try-catch logic to translate optimistic lock errors
   * into client-friendly HTTP 409 Conflict exceptions.
   */
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

  /**
   * Extracts distinct @username tags from unstructured text.
   * Returns a deduplicated array to avoid redundant DB queries if a user is tagged twice.
   */
  private extractMentionedUsernames(content: string): string[] {
    const matches = content.match(/@([a-z0-9_]+)/gi);
    if (!matches) {
      return [];
    }

    return Array.from(
      new Set(matches.map((mention) => mention.slice(1).toLowerCase())),
    );
  }

  /**
   * Maps an array of username strings to actual User entities.
   * Used to establish the many-to-many relation for notifications.
   */
  private async resolveMentionedUsers(content: string): Promise<User[]> {
    const usernames = this.extractMentionedUsernames(content);
    if (!usernames.length) {
      return [];
    }

    return this.usersService.findUsersByUsernames(usernames);
  }
}
