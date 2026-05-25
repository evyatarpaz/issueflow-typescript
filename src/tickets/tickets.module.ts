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
import { TicketsBulkOperationsController } from './bulk-operations/tickets-bulk-operations.controller';
import { TicketsBulkOperationsService } from './bulk-operations/tickets-bulk-operations.service';
import { TicketsCronService } from './automation/tickets-escalation.service';
import { User } from '../users/entities/user.entity';

/**
 * NestJS Module encapsulating the domain's primary unit of work (Tickets).
 * Acts as the aggregate hub for sub-domains including attachments, bulk operations,
 * dependency management, and cron-driven automation (escalations).
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Ticket, Attachment, User]),
    AuditLogsModule,
  ],
  controllers: [
    TicketsController,
    TicketDependenciesController,
    TicketAttachmentsController,
    TicketsBulkOperationsController,
  ],
  providers: [
    TicketsService,
    TicketAttachmentsService,
    TicketsBulkOperationsService,
    TicketsCronService,
  ],
  exports: [TicketsService],
})
export class TicketsModule {}
