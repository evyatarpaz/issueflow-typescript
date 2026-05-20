import {
  Controller,
  Post,
  Delete,
  Param,
  HttpCode,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  ParseIntPipe,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { TicketAttachmentsService } from './ticket-attachments.service';
import { JwtAuthGuard } from '../../auth/jwt.guard';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

@ApiTags('Ticket Attachments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tickets/:ticketId/attachments')
export class TicketAttachmentsController {
  constructor(
    private readonly ticketAttachmentsService: TicketAttachmentsService,
  ) {}

  @Post()
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOperation({ summary: 'Upload an attachment for a ticket' })
  @ApiResponse({ status: 200, description: 'Attachment uploaded successfully' })
  uploadAttachment(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_FILE_SIZE }),
          new FileTypeValidator({
            fileType: 'image/png|image/jpeg|application/pdf|text/plain',
          }),
        ],
      }),
    )
    file: any,
  ) {
    return this.ticketAttachmentsService.uploadAttachment(ticketId, file);
  }

  @Delete(':attachmentId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete an attachment from a ticket' })
  @ApiResponse({ status: 200, description: 'Attachment deleted successfully' })
  deleteAttachment(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Param('attachmentId', ParseIntPipe) attachmentId: number,
  ) {
    return this.ticketAttachmentsService.deleteAttachment(
      ticketId,
      attachmentId,
    );
  }
}
