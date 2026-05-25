import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Ticket,
  TicketPriority,
  TicketStatus,
  TicketType,
} from '../entities/ticket.entity';
import { ImportTicketResponseDto } from './dto/import-ticket-response.dto';
import { Readable } from 'stream';
import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify';

/**
 * Handles heavy I/O data ingestion and extraction for the Tickets domain.
 * Utilizes Node.js Streams to prevent memory exhaustion (OOM errors) during large CSV processing.
 */
@Injectable()
export class TicketsBulkOperationsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
  ) {}

  /**
   * Pipelined CSV Exporter.
   * Streams database rows directly into the CSV stringifier rather than loading
   * the entire dataset into application memory array.
   */
  async exportTickets(projectId: number): Promise<Readable> {
    const query = this.ticketRepository
      .createQueryBuilder('ticket')
      .select([
        'ticket.id AS id',
        'ticket.title AS title',
        'ticket.description AS description',
        'ticket.status AS status',
        'ticket.priority AS priority',
        'ticket.type AS type',
        'ticket.assigneeId AS assigneeId',
      ])
      .where('ticket.projectId = :projectId', { projectId })
      .andWhere('ticket.isDeleted = false');

    const ticketStream = await query.stream();
    const csvStream = stringify({
      header: true,
      columns: [
        'id',
        'title',
        'description',
        'status',
        'priority',
        'type',
        'assigneeId',
      ],
    });

    ticketStream.on('error', (error) => csvStream.destroy(error));
    ticketStream.pipe(csvStream);
    return csvStream;
  }

  /**
   * Streams a CSV Buffer, mapping each row sequentially into the database.
   * Catches row-level errors (e.g. enum violations) to provide a partial success response
   * instead of failing the entire import batch.
   */
  async importTickets(
    projectId: number,
    fileBuffer: Buffer,
  ): Promise<ImportTicketResponseDto> {
    const summary: ImportTicketResponseDto = {
      created: 0,
      failed: 0,
      errors: [],
    };

    const parser = parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_quotes: false,
    });

    const stream = Readable.from(fileBuffer);
    let rowNumber = 1;

    return new Promise((resolve, reject) => {
      const onError = (error: Error) => {
        reject(error);
      };

      parser.on('error', onError);

      parser.on('data', async (row: Record<string, string>) => {
        // Pause the stream during asynchronous database saves to prevent flooding the connection pool.
        parser.pause();
        rowNumber += 1;

        try {
          await this.processRow(row, projectId);
          summary.created += 1;
        } catch (error) {
          summary.failed += 1;
          summary.errors.push(
            `Row ${rowNumber}: ${error instanceof Error ? error.message : 'Invalid row'}`,
          );
        } finally {
          parser.resume();
        }
      });

      parser.on('end', () => resolve(summary));
      stream.pipe(parser);
    });
  }

  /**
   * Translates unstructured CSV string properties back into strict Ticket domain enums.
   */
  private async processRow(
    row: Record<string, string>,
    projectId: number,
  ): Promise<void> {
    const title = row.title?.trim();
    const descriptionRaw = row.description;
    const description = descriptionRaw?.trim() ?? '';
    const status = row.status?.trim() as TicketStatus;
    const priority = row.priority?.trim() as TicketPriority;
    const type = row.type?.trim() as TicketType;
    const assigneeId = this.parseAssigneeId(row.assigneeId);

    if (!title) {
      throw new BadRequestException('Missing required title');
    }

    if (descriptionRaw === undefined) {
      throw new BadRequestException('Missing required description');
    }

    if (!Object.values(TicketStatus).includes(status)) {
      throw new BadRequestException(
        `Invalid status value: ${row.status ?? 'undefined'}`,
      );
    }

    if (!Object.values(TicketPriority).includes(priority)) {
      throw new BadRequestException(
        `Invalid priority value: ${row.priority ?? 'undefined'}`,
      );
    }

    if (!Object.values(TicketType).includes(type)) {
      throw new BadRequestException(
        `Invalid type value: ${row.type ?? 'undefined'}`,
      );
    }

    const ticket = this.ticketRepository.create({
      title,
      description,
      status,
      priority,
      type,
      projectId,
      assigneeId,
      dueDate: null,
      isOverdue: false,
      isDeleted: false,
      deletedAt: null,
    });

    await this.ticketRepository.save(ticket);
  }

  /**
   * Safely deserializes the nullable foreign key ID from the CSV file.
   */
  private parseAssigneeId(value: string | undefined): number | null {
    if (value === undefined || value === null || value.trim() === '') {
      return null;
    }

    const parsed = Number(value);

    if (Number.isNaN(parsed) || !Number.isInteger(parsed) || parsed < 1) {
      throw new BadRequestException(`Invalid assigneeId value: ${value}`);
    }

    return parsed;
  }
}
