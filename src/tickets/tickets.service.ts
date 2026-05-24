import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, OptimisticLockVersionMismatchError } from 'typeorm';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  AuditAction,
  AuditActor,
  AuditEntityType,
} from '../audit-logs/entities/audit-log.entity';
import { Ticket, TicketStatus } from './entities/ticket.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { AddDependencyDto } from './dependencies/add-dependency.dto';

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
    private readonly auditLogsService: AuditLogsService,
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

    const savedTicket = await this.saveTicket(ticket);
    await this.logTicketAction(AuditAction.CREATE, savedTicket.id);
    return savedTicket;
  }

  async findAll(projectId?: number): Promise<Ticket[]> {
    const query = this.ticketRepository.createQueryBuilder('ticket');

    query.where('ticket.isDeleted = :isDeleted', { isDeleted: false });

    if (projectId !== undefined) {
      query.andWhere('ticket.projectId = :projectId', { projectId });
    }

    return query.getMany();
  }

  async findOne(id: number, loadBlockedBy = false): Promise<Ticket> {
    const ticket = await this.ticketRepository.findOne({
      where: { id, isDeleted: false },
      relations: loadBlockedBy ? ['blockedBy'] : [],
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }

    return ticket;
  }

  async addDependency(
    ticketId: number,
    addDependencyDto: AddDependencyDto,
  ): Promise<Ticket[]> {
    const ticket = await this.findOne(ticketId, true);
    const blocker = await this.findOne(addDependencyDto.blockedBy);

    if (ticket.projectId !== blocker.projectId) {
      throw new BadRequestException('Tickets must belong to the same project');
    }

    ticket.blockedBy = ticket.blockedBy ?? [];

    if (!ticket.blockedBy.some((existing) => existing.id === blocker.id)) {
      ticket.blockedBy.push(blocker);
    }

    await this.saveTicket(ticket);
    return ticket.blockedBy;
  }

  async getBlockedBy(ticketId: number): Promise<Ticket[]> {
    const ticket = await this.findOne(ticketId, true);
    return ticket.blockedBy ?? [];
  }

  async removeDependency(
    ticketId: number,
    blockerId: number,
  ): Promise<Ticket[]> {
    const ticket = await this.findOne(ticketId, true);
    ticket.blockedBy = (ticket.blockedBy ?? []).filter(
      (blocked) => blocked.id !== blockerId,
    );

    await this.saveTicket(ticket);
    return ticket.blockedBy;
  }

  async update(id: number, updateTicketDto: UpdateTicketDto): Promise<Ticket> {
    const needsBlockedBy = updateTicketDto.status === TicketStatus.DONE;
    const ticket = await this.findOne(id, needsBlockedBy);
    this.ensureNotDone(ticket);

    if (
      updateTicketDto.status &&
      !this.isStatusTransitionAllowed(ticket.status, updateTicketDto.status)
    ) {
      throw new BadRequestException(
        'Ticket status can only move forward through TODO -> IN_PROGRESS -> IN_REVIEW -> DONE',
      );
    }

    if (
      updateTicketDto.status === TicketStatus.DONE &&
      ticket.blockedBy?.some((blocker) => blocker.status !== TicketStatus.DONE)
    ) {
      throw new BadRequestException(
        'Cannot close ticket with unresolved blockers',
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
      ticket.isOverdue = false;
    }

    if (updateTicketDto.type !== undefined) {
      ticket.type = updateTicketDto.type;
    }

    if (updateTicketDto.assigneeId !== undefined) {
      ticket.assigneeId = updateTicketDto.assigneeId;
    }

    const updatedTicket = await this.saveTicket(ticket);
    await this.logTicketAction(AuditAction.UPDATE, updatedTicket.id);
    return updatedTicket;
  }

  async remove(id: number): Promise<void> {
    const ticket = await this.findOne(id);
    this.ensureNotDone(ticket);

    ticket.isDeleted = true;
    ticket.deletedAt = new Date();

    await this.saveTicket(ticket);
    await this.logTicketAction(AuditAction.DELETE, ticket.id);
  }

  async findDeleted(projectId: number): Promise<Ticket[]> {
    return this.ticketRepository.find({
      where: { projectId, isDeleted: true },
    });
  }

  async restore(id: number, userId: number): Promise<Ticket> {
    const ticket = await this.ticketRepository.findOne({
      where: { id, isDeleted: true },
    });

    if (!ticket) {
      throw new NotFoundException(`Deleted ticket with ID ${id} not found`);
    }

    ticket.isDeleted = false;
    ticket.deletedAt = null;

    const restoredTicket = await this.saveTicket(ticket);
    await this.auditLogsService.logAction(
      AuditAction.UPDATE,
      AuditEntityType.TICKET,
      restoredTicket.id,
      userId,
      AuditActor.USER,
    );
    return restoredTicket;
  }

  private async logTicketAction(action: AuditAction, ticketId: number) {
    await this.auditLogsService.logAction(
      action,
      AuditEntityType.TICKET,
      ticketId,
      0,
      AuditActor.USER,
    );
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
