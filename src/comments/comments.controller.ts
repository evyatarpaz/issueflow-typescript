import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { JwtAuthGuard } from '../common/guards/jwt.guard';

/**
 * Exposes the REST API for ticket comments.
 * Enforces a hierarchical routing structure (tickets/:ticketId/comments) to
 * ensure all comment interactions are explicitly scoped to a parent ticket,
 * mirroring the domain's aggregate root constraints.
 */
@ApiTags('Comments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tickets/:ticketId/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  /**
   * Retrieves all conversational entries linked to the specific ticket.
   *
   * @param ticketId - The ID of the scoped aggregate root.
   * @returns An array of comments, sequentially ordered.
   */
  @Get()
  @HttpCode(200)
  @ApiOperation({ summary: 'Get all comments for a ticket' })
  @ApiResponse({ status: 200, description: 'Comments fetched successfully' })
  findAllByTicket(@Param('ticketId', ParseIntPipe) ticketId: number) {
    return this.commentsService.findAllByTicket(ticketId);
  }

  /**
   * Attaches a new conversational entry to the specified ticket.
   *
   * @param ticketId - The parent ticket.
   * @param createCommentDto - The validated input payload.
   * @returns The generated comment entity with resolution metadata (like mentions).
   */
  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: 'Create a new comment for the ticket' })
  @ApiResponse({ status: 200, description: 'Comment created successfully' })
  create(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Body() createCommentDto: CreateCommentDto,
  ) {
    return this.commentsService.create(ticketId, createCommentDto);
  }

  /**
   * Applies an in-place update to a specific comment's body.
   * Subject to optimistic locking via HTTP 409 responses if a concurrent mutation occurred.
   *
   * @param ticketId - The parent ticket.
   * @param commentId - The specific comment identifier.
   * @param updateCommentDto - The revised content payload.
   * @returns The mutated comment.
   */
  @Patch(':commentId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Update an existing comment' })
  @ApiResponse({ status: 200, description: 'Comment updated successfully' })
  @ApiResponse({
    status: 409,
    description: 'Conflict due to concurrent modification',
  })
  update(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
    @Body() updateCommentDto: UpdateCommentDto,
  ) {
    return this.commentsService.update(ticketId, commentId, updateCommentDto);
  }

  /**
   * Irreversibly purges a comment thread entry.
   *
   * @param ticketId - The parent ticket.
   * @param commentId - The specific comment identifier.
   */
  @Delete(':commentId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete a comment' })
  @ApiResponse({ status: 200, description: 'Comment deleted successfully' })
  remove(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
  ) {
    return this.commentsService.remove(ticketId, commentId);
  }
}
