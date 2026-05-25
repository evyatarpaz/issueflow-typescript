import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  VersionColumn,
  ManyToMany,
  JoinTable,
  OneToMany,
} from 'typeorm';
import { Attachment } from './attachment.entity';

export enum TicketStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  IN_REVIEW = 'IN_REVIEW',
  DONE = 'DONE',
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum TicketType {
  BUG = 'BUG',
  FEATURE = 'FEATURE',
  TECHNICAL = 'TECHNICAL',
}

/**
 * The primary domain entity representing a unit of work within a project.
 * Implements self-referential many-to-many relationships for dependency graphs
 * and utilizes optimistic locking to prevent race conditions during concurrent updates.
 */
@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column({ type: 'enum', enum: TicketStatus, default: TicketStatus.TODO })
  status: TicketStatus;

  @Column({
    type: 'enum',
    enum: TicketPriority,
    default: TicketPriority.MEDIUM,
  })
  priority: TicketPriority;

  @Column({ type: 'enum', enum: TicketType, default: TicketType.BUG })
  type: TicketType;

  @Column({ type: 'int' })
  projectId: number;

  @Column({ type: 'int', nullable: true })
  assigneeId: number | null;

  @Column({ type: 'timestamp', nullable: true })
  dueDate: Date | null;

  @Column({ default: false })
  isOverdue: boolean;

  /** Implements soft-delete to maintain audit history. */
  @Column({ default: false })
  isDeleted: boolean;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  /**
   * Tracks tickets that must be resolved before this ticket can transition to DONE.
   * This is a self-referential relationship modeling a Directed Acyclic Graph (DAG).
   */
  @ManyToMany(() => Ticket, (ticket) => ticket.blocking)
  @JoinTable({
    name: 'ticket_dependencies',
    joinColumn: {
      name: 'ticketId',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'blockedById',
      referencedColumnName: 'id',
    },
  })
  blockedBy: Ticket[];

  /** The inverse side of the dependency graph. */
  @ManyToMany(() => Ticket, (ticket) => ticket.blockedBy)
  blocking: Ticket[];

  @OneToMany(() => Attachment, (attachment) => attachment.ticket)
  attachments?: Attachment[];

  /**
   * Enforces Optimistic Concurrency Control.
   * Incremented automatically by TypeORM on every UPDATE. If a client attempts to update
   * using a stale version, the database throws an OptimisticLockVersionMismatchError.
   */
  @VersionColumn()
  version: number;
}
