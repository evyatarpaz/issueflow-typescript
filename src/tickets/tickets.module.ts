import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { Ticket } from './entities/ticket.entity';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { TicketDependenciesController } from './ticket-dependencies.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Ticket]), AuditLogsModule],
  controllers: [TicketsController, TicketDependenciesController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}
