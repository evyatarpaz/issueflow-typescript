import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

/**
 * Data Transfer Object for updating an existing comment.
 * Enforces that updates actually contain textual content, preventing
 * clients from accidentally wiping out comment histories with empty strings.
 */
export class UpdateCommentDto {
  @ApiProperty({
    example: 'Updating comment text for clarity.',
    description: 'The updated content of the comment',
  })
  @IsString()
  @IsNotEmpty()
  content: string;
}
