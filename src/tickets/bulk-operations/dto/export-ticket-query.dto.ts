import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class ExportTicketQueryDto {
  @ApiProperty({
    type: Number,
    description: 'The project id used to filter tickets',
  })
  @IsInt()
  @Min(1)
  projectId: number;
}
