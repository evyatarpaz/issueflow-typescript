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

/**
 * TypeORM Entity mapping for a Comment.
 * Represents user-generated conversational threads on Tickets.
 * Incorporates an optimistic locking strategy (version column) to gracefully
 * reject concurrent conflicting edits instead of relying on expensive DB-level locking.
 */
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

  /**
   * Tracks users explicitly mentioned in the comment body via '@username'.
   * Mapped via an associative table to decouple parsing logic from rendering,
   * enabling fast notification lookups without relying on real-time regex parsing.
   */
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

  /**
   * Ensures data integrity during concurrent modification attempts.
   * If two users edit the same comment simultaneously, the second save fails,
   * prompting the client to fetch the latest state rather than overwriting silently.
   */
  @VersionColumn()
  version: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
