import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket, TicketPriority } from '../entities/ticket.entity';

@Injectable()
export class TicketsCronService {
  private readonly logger = new Logger(TicketsCronService.name);

  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleAutoEscalation() {
    this.logger.log('Running auto-escalation check for overdue tickets...');
    const now = new Date();

    const tickets = await this.ticketRepository
      .createQueryBuilder('ticket')
      .where('ticket.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('ticket.dueDate < :now', { now })
      .andWhere('(ticket.priority != :critical OR ticket.isOverdue = false)', {
        critical: TicketPriority.CRITICAL,
      })
      .getMany();

    if (tickets.length === 0) {
      this.logger.log('No tickets require escalation.');
      return;
    }

    let escalatedCount = 0;

    for (const ticket of tickets) {
      // Promote priority
      if (ticket.priority === TicketPriority.LOW) {
        ticket.priority = TicketPriority.MEDIUM;
      } else if (ticket.priority === TicketPriority.MEDIUM) {
        ticket.priority = TicketPriority.HIGH;
      } else if (ticket.priority === TicketPriority.HIGH) {
        ticket.priority = TicketPriority.CRITICAL;
      }

      // If already CRITICAL or just became CRITICAL, and still overdue
      if (ticket.priority === TicketPriority.CRITICAL) {
        ticket.isOverdue = true;
      }

      await this.ticketRepository.save(ticket);
      escalatedCount++;
    }

    this.logger.log(
      `Auto-escalation complete. Escalated ${escalatedCount} tickets.`,
    );
  }
}
