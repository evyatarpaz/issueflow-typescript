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
import { JwtAuthGuard } from '../auth/jwt.guard';

@ApiTags('Comments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get('tickets/:ticketId/comments')
  @ApiOperation({ summary: 'Get all comments for a ticket' })
  @ApiResponse({ status: 200, description: 'Comments fetched successfully' })
  findAllByTicket(@Param('ticketId', ParseIntPipe) ticketId: number) {
    return this.commentsService.findAllByTicket(ticketId);
  }

  @Post('tickets/:ticketId/comments')
  @HttpCode(201)
  @ApiOperation({ summary: 'Create a new comment for the ticket' })
  @ApiResponse({ status: 201, description: 'Comment created successfully' })
  create(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Body() createCommentDto: CreateCommentDto,
  ) {
    return this.commentsService.create(ticketId, createCommentDto);
  }

  @Patch('comments/:commentId')
  @ApiOperation({ summary: 'Update an existing comment' })
  @ApiResponse({ status: 200, description: 'Comment updated successfully' })
  @ApiResponse({
    status: 409,
    description: 'Conflict due to concurrent modification',
  })
  update(
    @Param('commentId', ParseIntPipe) commentId: number,
    @Body() updateCommentDto: UpdateCommentDto,
  ) {
    return this.commentsService.update(commentId, updateCommentDto);
  }

  @Delete('comments/:commentId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a comment' })
  @ApiResponse({ status: 204, description: 'Comment deleted successfully' })
  remove(@Param('commentId', ParseIntPipe) commentId: number) {
    return this.commentsService.remove(commentId);
  }
}
