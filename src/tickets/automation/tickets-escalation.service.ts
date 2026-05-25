import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket, TicketPriority } from '../entities/ticket.entity';

/**
 * Automated SLA Enforcement Engine.
 * Runs chron-based background jobs to continuously poll for SLA breaches
 * and automatically escalate priority thresholds without manual intervention.
 */
@Injectable()
export class TicketsCronService {
  private readonly logger = new Logger(TicketsCronService.name);

  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
  ) {}

  /**
   * Hourly job evaluating the `dueDate` against the current timestamp.
   * Bumps priority sequentially (LOW -> MEDIUM -> HIGH -> CRITICAL) on every run
   * if the ticket remains overdue. Once a ticket reaches CRITICAL, it sets the `isOverdue`
   * flag to true to halt further processing and alert the frontend.
   */
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
      // Step 1: Promote priority sequentially through the domain enum order.
      if (ticket.priority === TicketPriority.LOW) {
        ticket.priority = TicketPriority.MEDIUM;
      } else if (ticket.priority === TicketPriority.MEDIUM) {
        ticket.priority = TicketPriority.HIGH;
      } else if (ticket.priority === TicketPriority.HIGH) {
        ticket.priority = TicketPriority.CRITICAL;
      }

      // Step 2: Cap the escalation graph at CRITICAL and mark as explicitly overdue.
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
