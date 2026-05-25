import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Data Transfer Object for mutating project details.
 * Implements a partial update strategy where all fields are optional,
 * allowing clients to patch individual properties without sending the full object.
 */
export class UpdateProjectDto {
  @ApiProperty({
    example: 'Updated Project Name',
    description: 'The new name of the project',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    example: 'Updated description details',
    description: 'The new description',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;
}
