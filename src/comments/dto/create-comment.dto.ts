import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsInt } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({
    example: 'This ticket needs a regression test before merge.',
    description: 'The body content of the comment',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({
    example: 1,
    description: 'The ID of the user who wrote the comment',
  })
  @IsInt()
  authorId: number;
}
