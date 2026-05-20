import {
  Controller,
  Get,
  Post,
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
import { TicketsService } from '../tickets.service';
import { AddDependencyDto } from './add-dependency.dto';
import { JwtAuthGuard } from '../../auth/jwt.guard';

@ApiTags('Ticket Dependencies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tickets/:ticketId/dependencies')
export class TicketDependenciesController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: 'Add a blocking dependency to a ticket' })
  @ApiResponse({ status: 200, description: 'Dependency added successfully' })
  addDependency(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Body() addDependencyDto: AddDependencyDto,
  ) {
    return this.ticketsService.addDependency(ticketId, addDependencyDto);
  }

  @Get()
  @HttpCode(200)
  @ApiOperation({ summary: 'Get blockers for a ticket' })
  @ApiResponse({
    status: 200,
    description: 'Blocking tickets returned successfully',
  })
  getBlockedBy(@Param('ticketId', ParseIntPipe) ticketId: number) {
    return this.ticketsService.getBlockedBy(ticketId);
  }

  @Delete(':blockerId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Remove a blocking dependency from a ticket' })
  @ApiResponse({ status: 200, description: 'Dependency removed successfully' })
  removeDependency(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Param('blockerId', ParseIntPipe) blockerId: number,
  ) {
    return this.ticketsService.removeDependency(ticketId, blockerId);
  }
}
