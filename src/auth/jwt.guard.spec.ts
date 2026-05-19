import { JwtAuthGuard } from './jwt.guard';
import { AuthService } from './auth.service';
import { UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { JWT_SECRET } from './jwt-constants';
import { Role } from '../users/entities/user.entity';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  const mockAuthService = {
    isTokenBlacklisted: jest.fn(),
    verifyToken: jest.fn(),
  };

  beforeEach(() => {
    guard = new JwtAuthGuard(mockAuthService as unknown as AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should throw UnauthorizedException if authorization header is missing', () => {
    const context: any = {
      switchToHttp: () => ({ getRequest: () => ({ headers: {} }) }),
    };

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if token is invalid', () => {
    const context: any = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { authorization: 'Bearer invalid.token' },
        }),
      }),
    };
    mockAuthService.isTokenBlacklisted.mockReturnValue(false);
    mockAuthService.verifyToken.mockImplementation(() => {
      throw new UnauthorizedException();
    });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('should attach user and return true for valid token', () => {
    const token = jwt.sign(
      { sub: 1, username: 'testuser', role: Role.DEVELOPER },
      JWT_SECRET,
      { expiresIn: '1h' },
    );
    const request: any = { headers: { authorization: `Bearer ${token}` } };
    const context: any = {
      switchToHttp: () => ({ getRequest: () => request }),
    };

    mockAuthService.isTokenBlacklisted.mockReturnValue(false);
    mockAuthService.verifyToken.mockReturnValue({
      sub: 1,
      username: 'testuser',
      role: Role.DEVELOPER,
    });

    const result = guard.canActivate(context);
    expect(result).toBe(true);
    expect(request.user).toEqual({
      id: 1,
      username: 'testuser',
      role: Role.DEVELOPER,
    });
  });
});
