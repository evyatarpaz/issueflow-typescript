import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { Ticket } from './entities/ticket.entity';
import { Attachment } from './entities/attachment.entity';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { TicketDependenciesController } from './dependencies/ticket-dependencies.controller';
import { TicketAttachmentsController } from './attachments/ticket-attachments.controller';
import { TicketAttachmentsService } from './attachments/ticket-attachments.service';

@Module({
  imports: [TypeOrmModule.forFeature([Ticket, Attachment]), AuditLogsModule],
  controllers: [
    TicketsController,
    TicketDependenciesController,
    TicketAttachmentsController,
  ],
  providers: [TicketsService, TicketAttachmentsService],
  exports: [TicketsService],
})
export class TicketsModule {}
