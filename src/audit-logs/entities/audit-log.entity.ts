import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

/**
 * Defines the strict subset of domain events tracked by the audit system.
 * By using a strict enum, we prevent unbounded, unsearchable custom action strings
 * and enforce a finite state machine for auditable operations.
 */
export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  AUTO_ASSIGN = 'AUTO_ASSIGN',
}

/**
 * Represents the bounded contexts (entities) that are subject to auditing.
 * Used for polymorphic relations in the audit log without requiring strict
 * foreign key constraints, which would hinder archival or cross-database scenarios.
 */
export enum AuditEntityType {
  TICKET = 'TICKET',
  COMMENT = 'COMMENT',
  PROJECT = 'PROJECT',
}

/**
 * Distinguishes the origin of an action to satisfy compliance requirements.
 * Essential for identifying automated background processes versus manual user interactions.
 */
export enum AuditActor {
  USER = 'USER',
  SYSTEM = 'SYSTEM',
}

/**
 * TypeORM Entity mapping for the AuditLog.
 * Acts as an append-only, immutable record of critical domain events.
 * Crucial for security forensics, regulatory compliance, and system debugging.
 * Note: This entity purposefully lacks direct foreign keys (using entityType/entityId instead)
 * to prevent cascading deletes and maintain a historical record even if the original entity is purged.
 */
@Entity()
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: AuditAction })
  action: AuditAction;

  @Column({ type: 'enum', enum: AuditEntityType })
  entityType: AuditEntityType;

  @Column()
  entityId: number;

  @Column()
  performedBy: number;

  @Column({ type: 'enum', enum: AuditActor })
  actor: AuditActor;

  @CreateDateColumn()
  timestamp: Date;
}
