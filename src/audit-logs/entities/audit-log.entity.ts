import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  AUTO_ASSIGN = 'AUTO_ASSIGN',
}

export enum AuditEntityType {
  TICKET = 'TICKET',
  COMMENT = 'COMMENT',
  PROJECT = 'PROJECT',
}

export enum AuditActor {
  USER = 'USER',
  SYSTEM = 'SYSTEM',
}

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
