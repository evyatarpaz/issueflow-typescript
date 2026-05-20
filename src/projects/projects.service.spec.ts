import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProjectsService } from './projects.service';
import { Project } from './entities/project.entity';
import { User, Role } from '../users/entities/user.entity';
import { ForbiddenException } from '@nestjs/common';

describe('ProjectsService', () => {
  let service: ProjectsService;

  const mockProjectRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockUser: User = {
    id: 1,
    username: 'jdoe',
    email: 'jdoe@example.com',
    fullName: 'John Doe',
    password: 'hashed_password',
    role: Role.DEVELOPER,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAdmin: User = {
    ...mockUser,
    id: 2,
    role: Role.ADMIN,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: getRepositoryToken(Project),
          useValue: mockProjectRepository,
        },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create a new project with ownerId', async () => {
    const dto = {
      name: 'New Project',
      description: 'Desc',
      ownerId: mockUser.id,
    };

    mockProjectRepository.create.mockReturnValue({
      id: 1,
      ...dto,
    });
    mockProjectRepository.save.mockResolvedValue({
      id: 1,
      ...dto,
    });

    const result = await service.create(dto, mockUser);
    expect(result).toHaveProperty('ownerId', mockUser.id);
    expect(mockProjectRepository.create).toHaveBeenCalledWith(dto);
  });

  it('should return only active projects', async () => {
    mockProjectRepository.find.mockResolvedValue([{ id: 1, name: 'Active' }]);
    const result = await service.findAll();
    expect(result).toHaveLength(1);
    expect(mockProjectRepository.find).toHaveBeenCalledWith({
      where: { isDeleted: false },
    });
  });

  it('should throw ForbiddenException if non-owner updates project', async () => {
    const project = { id: 1, name: 'P1', ownerId: 99, isDeleted: false };
    mockProjectRepository.findOne.mockResolvedValue(project);

    await expect(
      service.update(1, { name: 'Change' }, mockUser),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should soft delete project when owner requests it', async () => {
    const project = {
      id: 1,
      name: 'P1',
      ownerId: mockUser.id,
      isDeleted: false,
    };
    mockProjectRepository.findOne.mockResolvedValue(project);
    mockProjectRepository.save.mockResolvedValue({
      ...project,
      isDeleted: true,
    });

    await service.remove(1, mockUser);
    expect(project.isDeleted).toBe(true);
  });

  it('should allow ADMIN to restore a soft-deleted project', async () => {
    const project = {
      id: 1,
      name: 'Deleted P',
      isDeleted: true,
      deletedAt: new Date(),
    };
    mockProjectRepository.findOne.mockResolvedValue(project);
    mockProjectRepository.save.mockResolvedValue({
      ...project,
      isDeleted: false,
      deletedAt: null,
    });

    const result = await service.restore(1, mockAdmin);
    expect(result.isDeleted).toBe(false);
    expect(result.deletedAt).toBeNull();
  });
});
