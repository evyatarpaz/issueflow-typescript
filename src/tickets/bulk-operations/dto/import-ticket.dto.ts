import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class ImportTicketDto {
  @ApiProperty({
    type: Number,
    description: 'Target project id for imported tickets',
  })
  @IsInt()
  @Min(1)
  projectId: number;
}
