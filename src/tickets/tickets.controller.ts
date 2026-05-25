import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  ParseIntPipe,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User, Role } from '../users/entities/user.entity';

/**
 * Exposes the REST API for Ticket management.
 * Enforces JWT authentication globally and delegates business rules, including
 * complex RBAC and optimistic locking resolutions, to the underlying TicketsService.
 */
@ApiTags('Tickets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: 'Create a new ticket' })
  @ApiResponse({ status: 200, description: 'Ticket created successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or validation failed',
  })
  create(@Body() createTicketDto: CreateTicketDto) {
    return this.ticketsService.create(createTicketDto);
  }

  /**
   * Retrieves all active tickets.
   * Strongly enforces project isolation by requiring a `projectId` query parameter,
   * preventing accidental cross-tenant data leaks.
   */
  @Get()
  @ApiOperation({
    summary: 'Get all active tickets filtered strictly by project ID',
  })
  @ApiQuery({
    name: 'projectId',
    required: true,
    type: Number,
    description: 'The project ID to filter tickets',
  })
  @ApiResponse({
    status: 200,
    description: 'List of active tickets for the project',
  })
  findAll(@Query('projectId', new ParseIntPipe()) projectId: number) {
    return this.ticketsService.findAll(projectId);
  }

  /**
   * Specialized compliance endpoint for reviewing soft-deleted data.
   * Hard-coded to require the ADMIN role at the controller level before delegating.
   */
  @Get('deleted')
  @ApiOperation({
    summary:
      'Get all soft-deleted tickets filtered strictly by project ID (ADMIN only)',
  })
  @ApiQuery({
    name: 'projectId',
    required: true,
    type: Number,
    description: 'The project ID to filter soft-deleted tickets',
  })
  @ApiResponse({
    status: 200,
    description: 'List of soft-deleted tickets for the project',
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  findDeleted(
    @Query('projectId', ParseIntPipe) projectId: number,
    @CurrentUser() user: User,
  ) {
    if (user.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'Only administrators can view deleted tickets',
      );
    }
    return this.ticketsService.findDeleted(projectId);
  }

  @Get(':ticketId')
  @ApiOperation({ summary: 'Get an active ticket by ID' })
  @ApiResponse({ status: 200, description: 'A single ticket record' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  findOne(@Param('ticketId', ParseIntPipe) ticketId: number) {
    return this.ticketsService.findOne(ticketId);
  }

  @Patch(':ticketId')
  @ApiOperation({ summary: 'Update an existing ticket' })
  @ApiResponse({ status: 200, description: 'Ticket updated successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid status transition or ticket is completed',
  })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  @ApiResponse({ status: 409, description: 'Concurrent modification conflict' })
  update(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Body() updateTicketDto: UpdateTicketDto,
  ) {
    return this.ticketsService.update(ticketId, updateTicketDto);
  }

  @Delete(':ticketId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Soft-delete a ticket' })
  @ApiResponse({ status: 200, description: 'Ticket soft-deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete completed ticket' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  remove(@Param('ticketId', ParseIntPipe) ticketId: number) {
    return this.ticketsService.remove(ticketId);
  }

  @Post(':ticketId/restore')
  @HttpCode(200)
  @ApiOperation({ summary: 'Restore a soft-deleted ticket (ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Ticket restored successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  restore(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @CurrentUser() user: User,
  ) {
    if (user.role !== Role.ADMIN) {
      throw new ForbiddenException('Only administrators can restore tickets');
    }
    return this.ticketsService.restore(ticketId, user.id);
  }
}
