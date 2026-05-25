import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { Project } from './entities/project.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { User } from '../users/entities/user.entity';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

/**
 * NestJS Module encapsulating the domain's primary aggregate root (Projects).
 * Injects repositories for Tickets and Users to facilitate cross-boundary cascade
 * operations (like soft-deletions) and complex JOIN queries for resource management.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Project, Ticket, User]), AuditLogsModule],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
