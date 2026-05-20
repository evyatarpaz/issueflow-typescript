import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  VersionColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('comments')
export class Comment {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column('text')
  content: string;

  @Column({ type: 'int' })
  authorId: number;

  @Column({ type: 'int' })
  ticketId: number;

  @ManyToMany(() => User, {
    cascade: false,
  })
  @JoinTable({
    name: 'comment_mentions',
    joinColumn: {
      name: 'comment_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'user_id',
      referencedColumnName: 'id',
    },
  })
  mentionedUsers: User[];

  @VersionColumn()
  version: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
