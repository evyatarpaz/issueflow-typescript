import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsInt } from 'class-validator';

/**
 * Data Transfer Object for creating a new comment.
 * Validates the raw payload to guarantee content presence and author association
 * before reaching the service layer, preventing malformed DB inserts.
 */
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
