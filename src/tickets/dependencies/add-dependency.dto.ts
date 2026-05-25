import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Data Transfer Object for mutating the ticket DAG.
 * Forces explicit type conversion (`@Type`) to handle numeric edge cases in the JSON body payload.
 */
export class AddDependencyDto {
  @ApiProperty({ description: 'The ticket ID that blocks this ticket' })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  blockedBy: number;
}
