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
