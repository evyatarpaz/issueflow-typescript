import {
  IsString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  MinLength,
} from 'class-validator';
import { Role } from '../entities/user.entity';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Data Transfer Object for system onboarding.
 * Validates the initial identity profile and ensures the raw password meets minimum entropy requirements
 * before it reaches the hashing algorithms in the service layer.
 */
export class CreateUserDto {
  @ApiProperty({
    example: 'jdoe',
    description: 'The unique username of the user',
  })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({
    example: 'jdoe@example.com',
    description: 'The email address of the user',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'The full name of the user',
  })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({
    example: 'Password123',
    description: 'User password',
    required: true,
  })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({
    example: 'DEVELOPER',
    enum: Role,
    description: 'The system role',
  })
  @IsEnum(Role)
  role: Role;
}
