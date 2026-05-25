import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

/**
 * TypeORM Entity representing the core aggregate root of the domain.
 * Projects act as the bounded context for tickets, dictating access control
 * and organizing the broader system hierarchy.
 */
@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  /**
   * Defines the primary custodian of the project.
   * Used heavily in RBAC (Role-Based Access Control) to allow owners to bypass
   * generic permission constraints for their specific projects.
   */
  @Column({ type: 'int' })
  ownerId: number;

  /**
   * Implements the soft-deletion pattern.
   * We never hard-delete projects to maintain historical integrity and prevent
   * cascading data loss across dependent tickets and audit logs.
   */
  @Column({ default: false })
  isDeleted: boolean;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /**
   * Tracks users explicitly invited to collaborate on this project.
   * Essential for scoping ticket assignments and calculating developer workloads.
   */
  @ManyToMany('User', (user: User) => user.projects)
  @JoinTable({ name: 'project_members' })
  members: User[];
}
