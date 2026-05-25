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

/**
 * Orchestrates all business logic relating to the Project aggregate root.
 * Enforces ownership access controls, manages the soft-deletion cascade lifecycle,
 * and compiles complex analytical queries (like developer workload).
 */
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

  /**
   * Instantiates a new project entity.
   *
   * @param createProjectDto - Validated payload containing name and owner.
   * @returns A promise resolving to the saved Project.
   */
  async create(createProjectDto: CreateProjectDto): Promise<Project> {
    const project = this.projectRepository.create({
      ...createProjectDto,
    });
    return this.projectRepository.save(project);
  }

  /**
   * Retrieves all projects that have not been soft-deleted.
   * Global tenant isolation is not enforced here, meaning all active projects are returned.
   */
  async findAll(): Promise<Project[]> {
    return this.projectRepository.find({
      where: { isDeleted: false },
    });
  }

  /**
   * Retrieves a specific project, throwing a 404 if it is soft-deleted or missing.
   */
  async findOne(id: number): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id, isDeleted: false },
    });
    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    return project;
  }

  /**
   * Calculates the active ticket distribution among developers within a project.
   * Used for resource allocation and sprint planning dashboards.
   *
   * @param projectId - The target project.
   * @returns An array mapping user IDs to their respective open ticket counts.
   */
  async getWorkload(
    projectId: number,
  ): Promise<{ userId: number; username: string; openTicketCount: number }[]> {
    // We bypass the standard ORM find methods and utilize the query builder here
    // to execute a highly optimized JOIN/GROUP BY operation directly in the database.
    // Fetching all entities into memory to calculate counts in Node.js would cause severe memory bloat.
    const workload = await this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user.projects', 'project', 'project.id = :projectId', {
        projectId,
      })
      .leftJoin(
        Ticket,
        'ticket',
        'ticket.assigneeId = user.id AND ticket.projectId = :projectId AND ticket.status != :doneStatus AND ticket.isDeleted = false',
        {
          projectId,
          doneStatus: 'DONE',
        },
      )
      .select(['user.id AS "userId"', 'user.username AS "username"'])
      .addSelect('COUNT(ticket.id)::int', 'openTicketCount')
      .where('user.role = :role', { role: Role.DEVELOPER })
      .groupBy('user.id')
      .addGroupBy('user.username')
      .orderBy('"openTicketCount"', 'ASC')
      .getRawMany(); // getRawMany is crucial here as the output does not map directly to a User entity.

    return workload.map((row) => ({
      userId: row.userId,
      username: row.username,
      openTicketCount:
        typeof row.openTicketCount === 'string'
          ? parseInt(row.openTicketCount, 10)
          : row.openTicketCount || 0,
    }));
  }

  /**
   * Mutates a project, enforcing strict RBAC checks to ensure only owners or admins can alter it.
   */
  async update(
    id: number,
    updateProjectDto: UpdateProjectDto,
    user: User,
  ): Promise<Project> {
    const project = await this.findOne(id);

    // Security Gate: Prevent cross-tenant mutations unless the actor is a system admin.
    if (project.ownerId !== user.id && user.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'You do not have permission to update this project',
      );
    }

    Object.assign(project, updateProjectDto);
    return this.projectRepository.save(project);
  }

  /**
   * Soft-deletes a project and recursively cascades the soft-deletion down to all child tickets.
   *
   * @param id - The project to purge.
   * @param user - The actor performing the deletion (for auditing).
   */
  async remove(id: number, user: User): Promise<void> {
    const project = await this.findOne(id);

    if (project.ownerId !== user.id && user.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'You do not have permission to delete this project',
      );
    }

    // We flag the parent project as deleted to instantly drop it from primary queries.
    project.isDeleted = true;
    project.deletedAt = new Date();
    await this.projectRepository.save(project);

    // Cascade delete associated active tickets
    // This manual cascade is necessary because TypeORM's built-in cascade soft-remove
    // can be unreliable across complex many-to-one bounds, and we must trigger audit logs.
    const activeTickets = await this.ticketRepository.find({
      where: { projectId: id, isDeleted: false },
    });

    for (const ticket of activeTickets) {
      ticket.isDeleted = true;
      ticket.deletedAt = new Date();
      await this.ticketRepository.save(ticket);

      // We must explicitly log the cascaded deletions to maintain compliance tracing.
      await this.auditLogsService.logAction(
        AuditAction.DELETE,
        AuditEntityType.TICKET,
        ticket.id,
        user.id,
        AuditActor.USER,
      );
    }

    // Log the primary project soft-deletion
    await this.auditLogsService.logAction(
      AuditAction.DELETE,
      AuditEntityType.PROJECT,
      project.id,
      user.id,
      AuditActor.USER,
    );
  }

  /**
   * Exposes soft-deleted records exclusively to administrative personnel for compliance review.
   */
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

  /**
   * Reverts a soft-deletion, making the project visible again.
   * Note: This does NOT recursively restore child tickets to prevent accidental resurrection of stale data.
   */
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
