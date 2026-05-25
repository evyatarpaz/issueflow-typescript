import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attachment } from '../entities/attachment.entity';
import { Ticket } from '../entities/ticket.entity';

/**
 * Manages the lifecycle of ticket file attachments.
 * Ensures strict referential integrity by validating the existence and active status
 * of parent tickets before allowing mutating operations.
 */
@Injectable()
export class TicketAttachmentsService {
  constructor(
    @InjectRepository(Attachment)
    private readonly attachmentRepository: Repository<Attachment>,
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
  ) {}

  /**
   * Persists attachment metadata linked to a specific ticket.
   * Prevents attaching files to soft-deleted or non-existent tickets.
   */
  async uploadAttachment(ticketId: number, file: any) {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId, isDeleted: false },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
    }

    const attachment = this.attachmentRepository.create({
      ticketId,
      filename: file.originalname,
      contentType: file.mimetype,
    });

    const savedAttachment = await this.attachmentRepository.save(attachment);

    return {
      id: savedAttachment.id,
      ticketId: savedAttachment.ticketId,
      filename: savedAttachment.filename,
      contentType: savedAttachment.contentType,
    };
  }

  /**
   * Hard-deletes an attachment record.
   * Requires matching both `ticketId` and `attachmentId` to prevent
   * cross-tenant or unauthorized deletion attacks.
   */
  async deleteAttachment(
    ticketId: number,
    attachmentId: number,
  ): Promise<void> {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId, isDeleted: false },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
    }

    const attachment = await this.attachmentRepository.findOne({
      where: { id: attachmentId, ticketId },
    });

    if (!attachment) {
      throw new NotFoundException(
        `Attachment with ID ${attachmentId} not found for ticket ${ticketId}`,
      );
    }

    await this.attachmentRepository.remove(attachment);
  }
}
