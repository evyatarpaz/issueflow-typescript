import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsInt,
  IsOptional,
  IsDateString,
} from 'class-validator';
import {
  TicketStatus,
  TicketPriority,
  TicketType,
} from '../entities/ticket.entity';

/**
 * Data Transfer Object for ticket creation.
 * Enforces strict typing and presence of critical domain enums before persistence.
 */
export class CreateTicketDto {
  @ApiProperty({
    example: 'Fix login failure when token expires',
    description: 'The title of the ticket',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'Users cannot refresh auth token after 1 hour',
    description: 'A detailed description of the ticket',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    enum: TicketStatus,
    example: TicketStatus.TODO,
    description: 'The current status of the ticket',
    required: false,
  })
  @IsEnum(TicketStatus)
  @IsOptional()
  status?: TicketStatus;

  @ApiProperty({
    enum: TicketPriority,
    example: TicketPriority.MEDIUM,
    description: 'The priority of the ticket',
  })
  @IsEnum(TicketPriority)
  priority: TicketPriority;

  @ApiProperty({
    enum: TicketType,
    example: TicketType.BUG,
    description: 'The type of ticket',
  })
  @IsEnum(TicketType)
  type: TicketType;

  @ApiProperty({
    example: 1,
    description: 'The project ID that owns this ticket',
  })
  @IsInt()
  projectId: number;

  /**
   * If omitted, the service layer will fallback to an auto-assignment algorithm
   * that queries the database for the developer with the lowest open ticket count.
   */
  @ApiProperty({
    example: 3,
    description: 'The optional assignee user ID',
    required: false,
  })
  @IsInt()
  @IsOptional()
  assigneeId?: number;

  @ApiProperty({
    example: '2026-07-01T12:00:00.000Z',
    description: 'Optional due date for the ticket',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  dueDate?: string;
}
