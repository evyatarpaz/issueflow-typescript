import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, OptimisticLockVersionMismatchError } from 'typeorm';
import { Ticket, TicketStatus } from './entities/ticket.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';

@Injectable()
export class TicketsService {
  private readonly statusFlow = [
    TicketStatus.TODO,
    TicketStatus.IN_PROGRESS,
    TicketStatus.IN_REVIEW,
    TicketStatus.DONE,
  ];

  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
  ) {}

  async create(createTicketDto: CreateTicketDto): Promise<Ticket> {
    const ticket = this.ticketRepository.create({
      title: createTicketDto.title,
      description: createTicketDto.description,
      status: createTicketDto.status ?? TicketStatus.TODO,
      priority: createTicketDto.priority,
      type: createTicketDto.type,
      projectId: createTicketDto.projectId,
      assigneeId:
        createTicketDto.assigneeId === undefined
          ? null
          : createTicketDto.assigneeId,
      dueDate: createTicketDto.dueDate
        ? new Date(createTicketDto.dueDate)
        : null,
      isOverdue: !!(
        createTicketDto.dueDate &&
        new Date(createTicketDto.dueDate) < new Date()
      ),
      isDeleted: false,
      deletedAt: null,
    });

    return this.saveTicket(ticket);
  }

  async findAll(projectId?: number): Promise<Ticket[]> {
    const query = this.ticketRepository.createQueryBuilder('ticket');

    query.where('ticket.isDeleted = :isDeleted', { isDeleted: false });

    if (projectId !== undefined) {
      query.andWhere('ticket.projectId = :projectId', { projectId });
    }

    return query.getMany();
  }

  async findOne(id: number): Promise<Ticket> {
    const ticket = await this.ticketRepository.findOne({
      where: { id, isDeleted: false },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }

    return ticket;
  }

  async update(id: number, updateTicketDto: UpdateTicketDto): Promise<Ticket> {
    const ticket = await this.findOne(id);
    this.ensureNotDone(ticket);

    if (
      updateTicketDto.status &&
      !this.isStatusTransitionAllowed(ticket.status, updateTicketDto.status)
    ) {
      throw new BadRequestException(
        'Ticket status can only move forward through TODO -> IN_PROGRESS -> IN_REVIEW -> DONE',
      );
    }

    if (updateTicketDto.dueDate !== undefined) {
      ticket.dueDate = updateTicketDto.dueDate
        ? new Date(updateTicketDto.dueDate)
        : null;
      ticket.isOverdue = !!(ticket.dueDate && ticket.dueDate < new Date());
    }

    if (updateTicketDto.title !== undefined) {
      ticket.title = updateTicketDto.title;
    }

    if (updateTicketDto.description !== undefined) {
      ticket.description = updateTicketDto.description;
    }

    if (updateTicketDto.status !== undefined) {
      ticket.status = updateTicketDto.status;
    }

    if (updateTicketDto.priority !== undefined) {
      ticket.priority = updateTicketDto.priority;
    }

    if (updateTicketDto.type !== undefined) {
      ticket.type = updateTicketDto.type;
    }

    if (updateTicketDto.assigneeId !== undefined) {
      ticket.assigneeId = updateTicketDto.assigneeId;
    }

    return this.saveTicket(ticket);
  }

  async remove(id: number): Promise<void> {
    const ticket = await this.findOne(id);
    this.ensureNotDone(ticket);

    ticket.isDeleted = true;
    ticket.deletedAt = new Date();

    await this.saveTicket(ticket);
  }

  private isStatusTransitionAllowed(
    current: TicketStatus,
    next: TicketStatus,
  ): boolean {
    const currentIndex = this.statusFlow.indexOf(current);
    const nextIndex = this.statusFlow.indexOf(next);

    return nextIndex === currentIndex || nextIndex === currentIndex + 1;
  }

  private ensureNotDone(ticket: Ticket): void {
    if (ticket.status === TicketStatus.DONE) {
      throw new BadRequestException(
        'Completed tickets cannot be modified or deleted',
      );
    }
  }

  private async saveTicket(ticket: Ticket): Promise<Ticket> {
    try {
      return await this.ticketRepository.save(ticket);
    } catch (error) {
      if (error instanceof OptimisticLockVersionMismatchError) {
        throw new ConflictException(
          'The ticket was modified concurrently. Please reload and retry.',
        );
      }
      throw error;
    }
  }
}
