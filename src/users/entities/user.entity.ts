import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { Exclude } from 'class-transformer';

/**
 * Defines the core hierarchical privileges within the platform.
 * ADMIN has sweeping global overrides, while DEVELOPER is restricted by tenant (Project) boundaries.
 */
export enum Role {
  ADMIN = 'ADMIN',
  DEVELOPER = 'DEVELOPER',
}

/**
 * The core identity and authentication primitive.
 * Maps directly to JWT payloads and enforces tenant-level access restrictions
 * via the many-to-many relationship with Projects.
 */
@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'full_name' })
  fullName: string;

  /**
   * The bcrypt-hashed authentication secret.
   * We apply `@Exclude()` from class-transformer and `{ select: false }` from TypeORM
   * as a defense-in-depth measure to prevent accidental leakage in API responses.
   */
  @Exclude()
  @Column({ select: false })
  password: string;

  @Column({ type: 'enum', enum: Role, default: Role.DEVELOPER })
  role: Role;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /**
   * The authorization graph for this user.
   * Determines which projects (and by extension, which tickets) the user can interact with.
   */
  @ManyToMany('Project', (project: Project) => project.members)
  projects: Project[];
}
