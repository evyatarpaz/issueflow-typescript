import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AuditLog,
  AuditAction,
  AuditActor,
  AuditEntityType,
} from './audit-log.entity';
import { FindAuditLogDto } from './dto/find-audit-log.dto';

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async logAction(
    action: AuditAction,
    entityType: AuditEntityType,
    entityId: number,
    performedBy: number,
    actor: AuditActor,
  ): Promise<AuditLog> {
    const logEntry = this.auditLogRepository.create({
      action,
      entityType,
      entityId,
      performedBy,
      actor,
    });

    return this.auditLogRepository.save(logEntry);
  }

  async findAll(query: FindAuditLogDto): Promise<AuditLog[]> {
    const where: Partial<FindAuditLogDto> = {};

    if (query.entityType !== undefined) {
      where.entityType = query.entityType;
    }

    if (query.entityId !== undefined) {
      where.entityId = query.entityId;
    }

    if (query.action !== undefined) {
      where.action = query.action;
    }

    if (query.actor !== undefined) {
      where.actor = query.actor;
    }

    return this.auditLogRepository.find({
      where,
      order: { timestamp: 'DESC' },
    });
  }
}
