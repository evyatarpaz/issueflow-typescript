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

/**
 * Data Transfer Object for ticket mutations.
 * All fields are optional to support partial JSON patches.
 * Requires the expected `version` token to safely resolve concurrent edits.
 */
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

  /**
   * The client's known version of the entity.
   * If this does not match the database version during an update, the service
   * throws a 409 Conflict to prevent lost updates (Optimistic Locking).
   */
  @ApiProperty({
    example: 1,
    description: 'The expected version of the ticket for optimistic locking',
    required: false,
  })
  @IsInt()
  @IsOptional()
  version?: number;
}
