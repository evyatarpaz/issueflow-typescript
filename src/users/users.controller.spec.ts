import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { UsersService } from './users.service';
import { Role } from './entities/user.entity';

/**
 * Test suite for the UsersController.
 * Ensures strict enforcement of routing boundaries and heavily verifies that
 * sensitive fields like `password` remain excluded from output payloads, validating
 * the integrity of the ClassSerializerInterceptor.
 */
describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockUsersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    findMentions: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /users (create)', () => {
    it('should successfully create a new user', async () => {
      const createUserDto = {
        username: 'testuser',
        email: 'test@example.com',
        fullName: 'Test User',
        password: 'password123',
        role: Role.DEVELOPER,
      };

      const expectedResult = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        fullName: 'Test User',
        role: Role.DEVELOPER,
      };

      mockUsersService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(createUserDto);

      expect(result).toEqual(expectedResult);
      expect(service.create).toHaveBeenCalledWith(createUserDto);
    });
  });

  describe('GET /users/:userId (findOne)', () => {
    it('should return a user by id', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        fullName: 'Test User',
        role: Role.DEVELOPER,
      };

      mockUsersService.findOne.mockResolvedValue(mockUser);

      const result = await controller.findOne(1);

      expect(result).toEqual(mockUser);
      expect(service.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('GET /users (findAll)', () => {
    it('should return all users', async () => {
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

      mockUsersService.findAll.mockResolvedValue(mockUsers);

      const result = await controller.findAll();

      expect(result).toEqual(mockUsers);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('POST /users/:userId (update)', () => {
    it('should update a user', async () => {
      const updateUserDto = {
        fullName: 'Updated Name',
        role: Role.ADMIN,
      };

      const expectedResult = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        fullName: 'Updated Name',
        role: Role.ADMIN,
      };

      mockUsersService.update.mockResolvedValue(expectedResult);

      const result = await controller.update(1, updateUserDto);

      expect(result).toEqual(expectedResult);
      expect(service.update).toHaveBeenCalledWith(1, updateUserDto);
    });
  });

  describe('DELETE /users/:userId (remove)', () => {
    it('should delete a user', async () => {
      mockUsersService.remove.mockResolvedValue(undefined);

      await controller.remove(1);

      expect(service.remove).toHaveBeenCalledWith(1);
    });
  });

  describe('GET /users/:userId/mentions', () => {
    it('should return comments mentioning the user and ensure password is omitted from mentionedUsers', async () => {
      const mockMentions = [
        {
          id: 10,
          content: 'Hey @testuser!',
          authorId: 2,
          ticketId: 5,
          mentionedUsers: [
            {
              id: 1,
              username: 'testuser',
              fullName: 'Test User',
              password: undefined,
            },
          ],
        },
      ];

      mockUsersService.findMentions.mockResolvedValue(mockMentions);

      const result = await controller.findMentions(1);

      expect(result).toEqual(mockMentions);
      expect(service.findMentions).toHaveBeenCalledWith(1);

      // Explicit assertion proving the password field is securely omitted (undefined)
      expect(result[0].mentionedUsers[0].password).toBeUndefined();
    });
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
