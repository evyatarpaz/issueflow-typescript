import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AuditLog,
  AuditAction,
  AuditActor,
  AuditEntityType,
} from './entities/audit-log.entity';
import { FindAuditLogDto } from './dto/find-audit-log.dto';

/**
 * Application service responsible for managing audit trails.
 * Isolates the creation and retrieval of audit entries from the core domain logic
 * to ensure that auditing concerns do not leak into business workflows.
 */
@Injectable()
export class AuditLogsService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  /**
   * Persists a new, immutable audit record to the database.
   * This method acts as a fire-and-forget or awaited telemetry logger for domain mutations.
   *
   * @param action - The finite action that occurred (e.g., CREATE, DELETE).
   * @param entityType - The bounded context or entity mutated.
   * @param entityId - The unique identifier of the mutated entity.
   * @param performedBy - The ID of the user or system identifier responsible.
   * @param actor - The classification of the initiator (USER vs SYSTEM).
   * @returns A promise resolving to the saved AuditLog instance.
   */
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

  /**
   * Retrieves a filtered list of audit logs ordered by recency.
   *
   * @param query - The validated filtering criteria (e.g., entityType, action).
   * @returns A promise resolving to an array of AuditLog instances matching the criteria.
   */
  async findAll(query: FindAuditLogDto): Promise<AuditLog[]> {
    const where: Partial<FindAuditLogDto> = {};

    // We explicitly build the where clause to ignore undefined values from the DTO,
    // ensuring TypeORM does not generate invalid SQL (e.g., WHERE entityType = NULL).
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

    // Default enforced sort order: newest first.
    // Necessary for forensic workflows where the most recent actions are the most relevant.
    return this.auditLogRepository.find({
      where,
      order: { timestamp: 'DESC' },
    });
  }
}
