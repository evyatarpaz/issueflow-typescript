import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role } from '../users/entities/user.entity';

/**
 * Unit test suite for the AuthService.
 * This suite validates the core Identity & Access Management (IAM) domain logic,
 * ensuring that identity verification, cryptographic payload generation, and token revocation
 * function correctly without requiring a live database or active network connections.
 */
describe('AuthService', () => {
  let service: AuthService;

  const mockUsersService = {
    findByUsername: jest.fn(),
  };

  // We mock the ConfigService to enforce deterministic test environments.
  // Relying on actual environment variables during unit tests causes flakiness
  // when executed in isolated CI/CD pipelines where those variables may not exist.
  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'JWT_SECRET') return 'issueflow_jwt_secret';
      if (key === 'JWT_EXPIRES_IN') return '1h';
      return null;
    }),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
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
        {
          provide: JwtService,
          useValue: mockJwtService,
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
    mockJwtService.sign.mockReturnValue('mocked_access_token');

    const result = await service.validateUser('testuser', 'password123');
    expect(result).toMatchObject({
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      fullName: 'Test User',
      role: Role.DEVELOPER,
    });
    // We strictly assert that the password field is omitted from the result.
    // This enforces the business rule that cryptographic hashes must never
    // leak outside the boundaries of the authentication domain service.
    expect(result).not.toHaveProperty('password');

    const loginResult = service.login(result as any);
    expect(loginResult).toEqual({
      accessToken: 'mocked_access_token',
      tokenType: 'Bearer',
      expiresIn: 3600,
    });

    expect(mockJwtService.sign).toHaveBeenCalledWith({
      sub: 1,
      username: 'testuser',
      role: Role.DEVELOPER,
    });
  });

  it('should return null for invalid credentials', async () => {
    mockUsersService.findByUsername.mockResolvedValue(null);
    const result = await service.validateUser('wrong', 'wrongpass');
    expect(result).toBeNull();
  });

  it('should blacklist a token on logout', () => {
    const token = 'mocked_access_token';
    expect(service.isTokenBlacklisted(token)).toBe(false);
    service.logout(token);
    expect(service.isTokenBlacklisted(token)).toBe(true);
  });

  it('should throw UnauthorizedException for invalid token verification', () => {
    mockJwtService.verify.mockImplementation(() => {
      throw new Error('Invalid signature');
    });

    expect(() => service.verifyToken('invalid.token')).toThrow(
      UnauthorizedException,
    );
  });
});
