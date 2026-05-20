import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateCommentDto {
  @ApiProperty({
    example: 'Updating comment text for clarity.',
    description: 'The updated content of the comment',
  })
  @IsString()
  @IsNotEmpty()
  content: string;
}
