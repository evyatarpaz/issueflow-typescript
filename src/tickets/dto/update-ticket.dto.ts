import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsDateString,
} from 'class-validator';
import {
  TicketStatus,
  TicketPriority,
  TicketType,
} from '../entities/ticket.entity';

export class UpdateTicketDto {
  @ApiProperty({
    example: 'Update login retry logic',
    description: 'The updated title of the ticket',
    required: false,
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({
    example: 'Improved description after triage',
    description: 'The updated description of the ticket',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    enum: TicketStatus,
    example: TicketStatus.IN_PROGRESS,
    description: 'The next allowed status transition for the ticket',
    required: false,
  })
  @IsEnum(TicketStatus)
  @IsOptional()
  status?: TicketStatus;

  @ApiProperty({
    enum: TicketPriority,
    example: TicketPriority.HIGH,
    description: 'The updated priority of the ticket',
    required: false,
  })
  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority;

  @ApiProperty({
    enum: TicketType,
    example: TicketType.FEATURE,
    description: 'The updated ticket type',
    required: false,
  })
  @IsEnum(TicketType)
  @IsOptional()
  type?: TicketType;

  @ApiProperty({
    example: 7,
    description: 'Updated assignee user ID',
    required: false,
  })
  @IsInt()
  @IsOptional()
  assigneeId?: number;

  @ApiProperty({
    example: '2026-07-15T12:00:00.000Z',
    description: 'The updated optional due date for the ticket',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  dueDate?: string;
}
