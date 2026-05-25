import { IsString, IsEnum, IsOptional } from 'class-validator';
import { Role } from '../entities/user.entity';

/**
 * Data Transfer Object for identity mutations.
 * Allows partial updates to non-critical fields (like full name) and role escalations.
 * Intentionally omits password updates which should be handled via a dedicated auth workflow.
 */
export class UpdateUserDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
