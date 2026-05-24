import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './entities/project.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { User, Role } from '../users/entities/user.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  AuditAction,
  AuditActor,
  AuditEntityType,
} from '../audit-logs/entities/audit-log.entity';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(
    createProjectDto: CreateProjectDto,
    user: User,
  ): Promise<Project> {
    const project = this.projectRepository.create({
      ...createProjectDto,
    });
    return this.projectRepository.save(project);
  }

  async findAll(): Promise<Project[]> {
    return this.projectRepository.find({
      where: { isDeleted: false },
    });
  }

  async findOne(id: number): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id, isDeleted: false },
    });
    if (!project) {
      throw new NotFoundException('Project with ID ${id} not found');
    }
    return project;
  }

  async getWorkload(projectId: number): Promise<{ userId: number; username: string; openTicketCount: number }[]> {
    const workload = await this.userRepository.createQueryBuilder('user')
      .leftJoin(Ticket, 'ticket', 'ticket.assigneeId = user.id AND ticket.projectId = :projectId AND ticket.status != :doneStatus AND ticket.isDeleted = false', {
        projectId,
        doneStatus: 'DONE'
      })
      .select(['user.id AS "userId"', 'user.username AS "username"'])
      .addSelect('COUNT(ticket.id)::int', 'openTicketCount')
      .where('user.role = :role', { role: Role.DEVELOPER })
      .groupBy('user.id')
      .addGroupBy('user.username')
      .orderBy('"openTicketCount"', 'ASC')
      .getRawMany();

    return workload.map(row => ({
      userId: row.userId,
      username: row.username,
      openTicketCount: typeof row.openTicketCount === 'string' ? parseInt(row.openTicketCount, 10) : (row.openTicketCount || 0)
    }));
  }

  async update(
    id: number,
    updateProjectDto: UpdateProjectDto,
    user: User,
  ): Promise<Project> {
    const project = await this.findOne(id);

    if (project.ownerId !== user.id && user.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'You do not have permission to update this project',
      );
    }

    Object.assign(project, updateProjectDto);
    return this.projectRepository.save(project);
  }

  async remove(id: number, user: User): Promise<void> {
    const project = await this.findOne(id);

    if (project.ownerId !== user.id && user.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'You do not have permission to delete this project',
      );
    }

    project.isDeleted = true;
    project.deletedAt = new Date();
    await this.projectRepository.save(project);

    // Cascade delete associated active tickets
    const activeTickets = await this.ticketRepository.find({
      where: { projectId: id, isDeleted: false },
    });

    for (const ticket of activeTickets) {
      ticket.isDeleted = true;
      ticket.deletedAt = new Date();
      await this.ticketRepository.save(ticket);
      await this.auditLogsService.logAction(
        AuditAction.DELETE,
        AuditEntityType.TICKET,
        ticket.id,
        user.id,
        AuditActor.USER,
      );
    }

    // Log project soft-deletion
    await this.auditLogsService.logAction(
      AuditAction.DELETE,
      AuditEntityType.PROJECT,
      project.id,
      user.id,
      AuditActor.USER,
    );
  }

  async findDeleted(user: User): Promise<Project[]> {
    if (user.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'Only administrators can view deleted projects',
      );
    }
    return this.projectRepository.find({
      where: { isDeleted: true },
    });
  }

  async restore(id: number, user: User): Promise<Project> {
    if (user.role !== Role.ADMIN) {
      throw new ForbiddenException('Only administrators can restore projects');
    }

    const project = await this.projectRepository.findOne({
      where: { id, isDeleted: true },
    });

    if (!project) {
      throw new NotFoundException(`Deleted project with ID ${id} not found`);
    }

    project.isDeleted = false;
    project.deletedAt = null;
    const restoredProject = await this.projectRepository.save(project);

    // Log project restoration
    await this.auditLogsService.logAction(
      AuditAction.UPDATE,
      AuditEntityType.PROJECT,
      restoredProject.id,
      user.id,
      AuditActor.USER,
    );

    return restoredProject;
  }
}
