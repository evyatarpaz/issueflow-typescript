import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { JWT_SECRET } from './jwt-constants';
import { Role } from '../users/entities/user.entity';

describe('AuthService', () => {
  let service: AuthService;
  const mockUsersService = {
    findByUsername: jest.fn(),
  };
  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'JWT_SECRET') return JWT_SECRET;
      if (key === 'JWT_EXPIRES_IN') return '1h';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should issue a valid JWT for correct credentials', async () => {
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      fullName: 'Test User',
      password: hashedPassword,
      role: Role.DEVELOPER,
    };
    mockUsersService.findByUsername.mockResolvedValue(user);

    const result = await service.validateUser('testuser', 'password123');
    expect(result).toMatchObject({
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      fullName: 'Test User',
      role: Role.DEVELOPER,
    });
    expect(result).not.toHaveProperty('password');

    const loginResult = service.login(result);
    expect(loginResult.accessToken).toBeDefined();

    const decoded = jwt.verify(loginResult.accessToken, JWT_SECRET) as any;
    expect(decoded.username).toBe('testuser');
    expect(decoded.sub).toBe(1);
    expect(decoded.role).toBe(Role.DEVELOPER);
  });

  it('should return null for invalid credentials', async () => {
    mockUsersService.findByUsername.mockResolvedValue(null);
    const result = await service.validateUser('wrong', 'wrongpass');
    expect(result).toBeNull();
  });

  it('should blacklist a token on logout', async () => {
    const token = jwt.sign(
      { sub: 1, username: 'testuser', role: Role.DEVELOPER },
      JWT_SECRET,
      {
        expiresIn: '1h',
      },
    );
    expect(service.isTokenBlacklisted(token)).toBe(false);
    service.logout(token);
    expect(service.isTokenBlacklisted(token)).toBe(true);
  });

  it('should throw UnauthorizedException for invalid token verification', () => {
    expect(() => service.verifyToken('invalid.token')).toThrow(
      UnauthorizedException,
    );
  });
});
