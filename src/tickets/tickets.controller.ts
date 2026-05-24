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
}
