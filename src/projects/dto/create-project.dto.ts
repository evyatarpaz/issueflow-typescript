import { IsNotEmpty, IsOptional, IsString, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Data Transfer Object for project instantiation.
 * Ensures the minimum required domain state (name and owner tracking)
 * is present before reaching the persistence layer.
 */
export class CreateProjectDto {
  @ApiProperty({
    example: 'IssueFlow Backend',
    description: 'The unique name of the project',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    example: 'NestJS REST API tracking application',
    description: 'Detailed project description',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: 1,
    description: 'The ID of the user who owns this project',
  })
  @IsInt()
  @IsNotEmpty()
  ownerId!: number;
}
