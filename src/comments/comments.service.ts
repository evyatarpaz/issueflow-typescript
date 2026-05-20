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

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
  ) {}

  async findAllByTicket(ticketId: number): Promise<Comment[]> {
    return this.commentRepository.find({
      where: { ticketId },
      order: { createdAt: 'ASC' },
    });
  }

  async create(
    ticketId: number,
    createCommentDto: CreateCommentDto,
  ): Promise<Comment> {
    const comment = this.commentRepository.create({
      ticketId,
      content: createCommentDto.content,
      authorId: createCommentDto.authorId,
    });

    return this.saveComment(comment);
  }

  async update(
    commentId: number,
    updateCommentDto: UpdateCommentDto,
  ): Promise<Comment> {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found`);
    }

    comment.content = updateCommentDto.content;
    return this.saveComment(comment);
  }

  async remove(commentId: number): Promise<void> {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found`);
    }

    await this.commentRepository.delete(commentId);
  }

  private async saveComment(comment: Comment): Promise<Comment> {
    try {
      return await this.commentRepository.save(comment);
    } catch (error) {
      if (error instanceof OptimisticLockVersionMismatchError) {
        throw new ConflictException(
          'Comment update failed due to concurrent modification. Please reload and retry.',
        );
      }
      throw error;
    }
  }
}
