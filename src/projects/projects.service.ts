import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './entities/project.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { User, Role } from '../users/entities/user.entity';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
  ) {}

  async create(
    createProjectDto: CreateProjectDto,
    user: User,
  ): Promise<Project> {
    const project = this.projectRepository.create({
      ...createProjectDto,
    });
    return this.projectRepository.save(project);
  }

  async findAll(): Promise<Project[]> {
    return this.projectRepository.find({
      where: { isDeleted: false },
    });
  }

  async findOne(id: number): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id, isDeleted: false },
    });
    if (!project) {
      throw new NotFoundException('Project with ID ${id} not found');
    }
    return project;
  }

  async update(
    id: number,
    updateProjectDto: UpdateProjectDto,
    user: User,
  ): Promise<Project> {
    const project = await this.findOne(id);

    if (project.ownerId !== user.id && user.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'You do not have permission to update this project',
      );
    }

    Object.assign(project, updateProjectDto);
    return this.projectRepository.save(project);
  }

  async remove(id: number, user: User): Promise<void> {
    const project = await this.findOne(id);

    if (project.ownerId !== user.id && user.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'You do not have permission to delete this project',
      );
    }

    project.isDeleted = true;
    project.deletedAt = new Date();
    await this.projectRepository.save(project);
  }

  async findDeleted(user: User): Promise<Project[]> {
    if (user.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'Only administrators can view deleted projects',
      );
    }
    return this.projectRepository.find({
      where: { isDeleted: true },
    });
  }

  async restore(id: number, user: User): Promise<Project> {
    if (user.role !== Role.ADMIN) {
      throw new ForbiddenException('Only administrators can restore projects');
    }

    const project = await this.projectRepository.findOne({
      where: { id, isDeleted: true },
    });

    if (!project) {
      throw new NotFoundException(`Deleted project with ID ${id} not found`);
    }

    project.isDeleted = false;
    project.deletedAt = null;
    return this.projectRepository.save(project);
  }
}
