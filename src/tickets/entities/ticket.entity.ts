import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  VersionColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';

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

  @Column({ default: false })
  isDeleted: boolean;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date | null;

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

  @ManyToMany(() => Ticket, (ticket) => ticket.blockedBy)
  blocking: Ticket[];

  @VersionColumn()
  version: number;
}
