import { ApiProperty } from '@nestjs/swagger';

export class ImportTicketResponseDto {
  @ApiProperty({
    type: Number,
    description: 'Number of tickets created successfully',
  })
  created: number;

  @ApiProperty({
    type: Number,
    description: 'Number of rows that failed validation or save',
  })
  failed: number;

  @ApiProperty({
    type: [String],
    description: 'Errors encountered during import',
  })
  errors: string[];
}
