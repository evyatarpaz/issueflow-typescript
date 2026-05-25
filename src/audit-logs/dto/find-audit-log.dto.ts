import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import {
  AuditAction,
  AuditActor,
  AuditEntityType,
} from '../entities/audit-log.entity';

/**
 * Data Transfer Object for filtering audit logs.
 * Validates incoming query parameters to prevent injection or invalid filtering schemas.
 * All properties are optional to allow for flexible, combinable search queries
 * (e.g., finding all DELETE actions, or all actions on a specific TICKET).
 */
export class FindAuditLogDto {
  @ApiPropertyOptional({ enum: AuditEntityType })
  @IsOptional()
  @IsEnum(AuditEntityType)
  entityType?: AuditEntityType;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  entityId?: number;

  @ApiPropertyOptional({ enum: AuditAction })
  @IsOptional()
  @IsEnum(AuditAction)
  action?: AuditAction;

  @ApiPropertyOptional({ enum: AuditActor })
  @IsOptional()
  @IsEnum(AuditActor)
  actor?: AuditActor;
}
