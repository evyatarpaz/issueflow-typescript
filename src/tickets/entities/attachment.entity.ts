import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Ticket } from './ticket.entity';

@Entity('attachments')
export class Attachment {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ type: 'int' })
  ticketId: number;

  @Column()
  filename: string;

  @Column()
  contentType: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Ticket, (ticket) => ticket.attachments, {
    onDelete: 'CASCADE',
  })
  ticket: Ticket;
}
