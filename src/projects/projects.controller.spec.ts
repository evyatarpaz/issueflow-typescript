import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { User, Role } from '../users/entities/user.entity';
import { AuthService } from '../auth/auth.service';

describe('ProjectsController', () => {
  let controller: ProjectsController;
  let service: ProjectsService;

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

  const mockProjectsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    findDeleted: jest.fn(),
    restore: jest.fn(),
  };

  const mockAuthService = {
    isTokenBlacklisted: jest.fn().mockReturnValue(false),
    verifyToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [
        {
          provide: ProjectsService,
          useValue: mockProjectsService,
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<ProjectsController>(ProjectsController);
    service = module.get<ProjectsService>(ProjectsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call service.create and return the result', async () => {
    const dto: CreateProjectDto = {
      name: 'Test Project',
      description: 'Test Desc',
      ownerId: mockUser.id,
    };
    const expectedResult = {
      id: 1,
      ...dto,
      isDeleted: false,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockProjectsService.create.mockResolvedValue(expectedResult);

    const result = await controller.create(dto, mockUser);
    expect(result).toEqual(expectedResult);
    expect(service.create).toHaveBeenCalledWith(dto, mockUser);
  });

  it('should call service.findAll and return an array of active projects', async () => {
    const expectedResult = [
      {
        id: 1,
        name: 'Active Project',
        ownerId: mockUser.id,
        isDeleted: false,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    mockProjectsService.findAll.mockResolvedValue(expectedResult);

    const result = await controller.findAll();
    expect(result).toEqual(expectedResult);
    expect(service.findAll).toHaveBeenCalled();
  });

  it('should call service.findOne with parse int validation and return a project', async () => {
    const expectedResult = {
      id: 1,
      name: 'Active Project',
      ownerId: mockUser.id,
      isDeleted: false,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockProjectsService.findOne.mockResolvedValue(expectedResult);

    const result = await controller.findOne(1);
    expect(result).toEqual(expectedResult);
    expect(service.findOne).toHaveBeenCalledWith(1);
  });

  it('should call service.update and return the updated project', async () => {
    const dto: UpdateProjectDto = { name: 'Updated Project Name' };
    const expectedResult = {
      id: 1,
      name: 'Updated Project Name',
      ownerId: mockUser.id,
      isDeleted: false,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockProjectsService.update.mockResolvedValue(expectedResult);

    const result = await controller.update(1, dto, mockUser);
    expect(result).toEqual(expectedResult);
    expect(service.update).toHaveBeenCalledWith(1, dto, mockUser);
  });

  it('should call service.remove and return void with status 200', async () => {
    mockProjectsService.remove.mockResolvedValue(undefined);

    const result = await controller.remove(1, mockUser);
    expect(result).toBeUndefined();
    expect(service.remove).toHaveBeenCalledWith(1, mockUser);
  });

  it('should call service.findDeleted for ADMIN users', async () => {
    const expectedResult = [
      {
        id: 2,
        name: 'Deleted Project',
        ownerId: mockUser.id,
        isDeleted: true,
        deletedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    mockProjectsService.findDeleted.mockResolvedValue(expectedResult);

    const result = await controller.findDeleted(mockUser);
    expect(result).toEqual(expectedResult);
    expect(service.findDeleted).toHaveBeenCalledWith(mockUser);
  });

  it('should call service.restore and return restored project data', async () => {
    const expectedResult = {
      id: 1,
      name: 'Restored Project',
      ownerId: mockUser.id,
      isDeleted: false,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockProjectsService.restore.mockResolvedValue(expectedResult);

    const result = await controller.restore(1, mockUser);
    expect(result).toEqual(expectedResult);
    expect(service.restore).toHaveBeenCalledWith(1, mockUser);
  });
});
