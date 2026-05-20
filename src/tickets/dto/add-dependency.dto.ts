import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class AddDependencyDto {
  @ApiProperty({ description: 'The ticket ID that blocks this ticket' })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  blockedBy: number;
}
