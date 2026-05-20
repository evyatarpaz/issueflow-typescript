import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, OptimisticLockVersionMismatchError } from 'typeorm';
import { Comment } from './entities/comment.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findAllByTicket(ticketId: number): Promise<Comment[]> {
    return this.commentRepository.find({
      where: { ticketId },
      order: { createdAt: 'ASC' },
      relations: ['mentionedUsers'],
    });
  }

  async create(
    ticketId: number,
    createCommentDto: CreateCommentDto,
  ): Promise<Comment> {
    const mentionedUsers = await this.resolveMentionedUsers(
      createCommentDto.content,
    );

    const comment = this.commentRepository.create({
      ticketId,
      content: createCommentDto.content,
      authorId: createCommentDto.authorId,
      mentionedUsers,
    });

    return this.saveComment(comment);
  }

  async update(
    ticketId: number,
    commentId: number,
    updateCommentDto: UpdateCommentDto,
  ): Promise<Comment> {
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

    return this.saveComment(comment);
  }

  async remove(ticketId: number, commentId: number): Promise<void> {
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

    return this.userRepository
      .createQueryBuilder('user')
      .select(['user.id', 'user.username', 'user.fullName'])
      .where('LOWER(user.username) IN (:...usernames)', {
        usernames,
      })
      .getMany();
  }
}
