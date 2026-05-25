import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Data Transfer Object strictly enforcing the cryptographic authentication contract.
 * Leverages class-validator pipes at the application boundary to intercept and sanitize
 * raw HTTP payloads before they penetrate the business layer, preventing injection attacks.
 */
export class LoginDto {
  @ApiProperty({ example: 'jdoe', description: 'The username for login' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: 'Password123!', description: 'The user password' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
