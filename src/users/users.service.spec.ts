import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User, Role } from './entities/user.entity';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { validate } from 'class-validator';
import { CreateUserDto } from './dto/create-user.dto';

describe('UsersService and DTO Validation', () => {
  let service: UsersService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let repo: Repository<User>;

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repo = module.get<Repository<User>>(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('User Registration (Service)', () => {
    it('should successfully register a new user and omit the password from the result', async () => {
      const createUserDto = {
        username: 'testuser',
        email: 'test@example.com',
        fullName: 'Test User',
        password: 'password123',
        role: Role.DEVELOPER,
      };

      // Mock that no user exists with this username/email
      mockUserRepository.findOne.mockResolvedValue(null);

      const createdEntity = {
        id: 1,
        ...createUserDto,
        password: 'hashedpassword123',
      };
      mockUserRepository.create.mockReturnValue(createdEntity);
      mockUserRepository.save.mockResolvedValue(createdEntity);

      const result = await service.create(createUserDto);

      expect(mockUserRepository.findOne).toHaveBeenCalled();
      expect(mockUserRepository.create).toHaveBeenCalled();
      expect(mockUserRepository.save).toHaveBeenCalled();

      // Verify password is NOT in the final result
      expect(result).not.toHaveProperty('password');
      expect(result.username).toEqual('testuser');
    });

    it('should throw BadRequestException if user already exists', async () => {
      const createUserDto = {
        username: 'testuser',
        email: 'test@example.com',
        fullName: 'Test User',
        password: 'password123',
        role: Role.DEVELOPER,
      };

      // Mock that user already exists
      mockUserRepository.findOne.mockResolvedValue({ id: 1, ...createUserDto });

      await expect(service.create(createUserDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('Fetch User By ID (Service)', () => {
    it('should return a user if found', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
      };
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findOne(1);
      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        select: ['id', 'username', 'email', 'fullName', 'role'],
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('DTO Validation', () => {
    it('should reject invalid roles during validation', async () => {
      const dto = new CreateUserDto();
      dto.username = 'testuser';
      dto.email = 'test@test.com';
      dto.fullName = 'Test Name';
      dto.password = 'password123';

      // @ts-expect-error - intentionally assigning invalid role for testing
      dto.role = 'SUPER_ADMIN';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toEqual('role');
      expect(errors[0].constraints?.isEnum).toBeDefined();
    });

    it('should pass validation with valid role', async () => {
      const dto = new CreateUserDto();
      dto.username = 'testuser';
      dto.email = 'test@test.com';
      dto.fullName = 'Test Name';
      dto.password = 'password123';
      dto.role = Role.ADMIN; // Valid role

      const errors = await validate(dto);
      expect(errors.length).toEqual(0);
    });
  });

  describe('Update User (Service)', () => {
    it('should successfully update a user', async () => {
      const existingUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        fullName: 'Test User',
        role: Role.DEVELOPER,
      };

      mockUserRepository.findOne.mockResolvedValue(existingUser);
      mockUserRepository.save.mockResolvedValue({
        ...existingUser,
        fullName: 'Updated User',
        role: Role.ADMIN,
      });

      const updateDto = { fullName: 'Updated User', role: Role.ADMIN };
      const result = await service.update(1, updateDto);

      expect(result.fullName).toEqual('Updated User');
      expect(result.role).toEqual(Role.ADMIN);
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when updating non-existent user', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const updateDto = { fullName: 'Updated User' };
      await expect(service.update(999, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('Delete User (Service)', () => {
    it('should successfully delete a user', async () => {
      const existingUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
      };

      mockUserRepository.findOne.mockResolvedValue(existingUser);
      mockUserRepository.remove.mockResolvedValue(undefined);

      await service.remove(1);

      expect(mockUserRepository.remove).toHaveBeenCalledWith(existingUser);
    });

    it('should throw NotFoundException when deleting non-existent user', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('Fetch All Users (Service)', () => {
    it('should return all users without passwords', async () => {
      const mockUsers = [
        {
          id: 1,
          username: 'user1',
          email: 'user1@example.com',
          fullName: 'User One',
          role: Role.DEVELOPER,
        },
        {
          id: 2,
          username: 'user2',
          email: 'user2@example.com',
          fullName: 'User Two',
          role: Role.ADMIN,
        },
      ];

      mockUserRepository.find.mockResolvedValue(mockUsers);

      const result = await service.findAll();

      expect(result).toEqual(mockUsers);
      expect(result[0]).not.toHaveProperty('password');
      expect(result[1]).not.toHaveProperty('password');
    });
  });
});
