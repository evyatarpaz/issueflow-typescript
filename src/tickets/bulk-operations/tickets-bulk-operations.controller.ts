import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseInterceptors,
  UploadedFile,
  StreamableFile,
  Header,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiConsumes,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { TicketsBulkOperationsService } from './tickets-bulk-operations.service';
import { ImportTicketDto } from './dto/import-ticket.dto';
import { ImportTicketResponseDto } from './dto/import-ticket-response.dto';
import { ExportTicketQueryDto } from './dto/export-ticket-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';

/**
 * REST interface for mass data ingestion and extraction.
 * Proxies Node.js ReadStreams to the HTTP Response via `StreamableFile` 
 * to pipe data directly to the client without buffering it in memory.
 */
@ApiTags('Ticket Bulk Operations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tickets')
export class TicketsBulkOperationsController {
  constructor(
    private readonly ticketsBulkOperationsService: TicketsBulkOperationsService,
  ) {}

  @Get('export')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="tickets.csv"')
  @ApiOperation({ summary: 'Export tickets as CSV for a project' })
  @ApiResponse({ status: 200, description: 'CSV export stream' })
  exportTickets(@Query() query: ExportTicketQueryDto): Promise<StreamableFile> {
    const stream = this.ticketsBulkOperationsService.exportTickets(
      query.projectId,
    );
    return stream.then((readable) => new StreamableFile(readable));
  }

  @Post('import')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'CSV file and projectId form data',
    schema: {
      type: 'object',
      properties: {
        projectId: { type: 'integer' },
        file: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['projectId', 'file'],
    },
  })
  @ApiOperation({ summary: 'Import tickets from a CSV file' })
  @ApiResponse({ status: 200, type: ImportTicketResponseDto })
  importTickets(
    @Body() importTicketDto: ImportTicketDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: 'text/csv' }),
        ],
      }),
    )
    file: any,
  ): Promise<ImportTicketResponseDto> {
    return this.ticketsBulkOperationsService.importTickets(
      importTicketDto.projectId,
      file.buffer,
    );
  }
}
