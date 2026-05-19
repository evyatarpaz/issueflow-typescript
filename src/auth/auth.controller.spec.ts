import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthController', () => {
  let controller: AuthController;
  const mockAuthService = {
    validateUser: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return a JWT when credentials are valid', async () => {
    const user = { id: 1, username: 'testuser', role: 'DEVELOPER' };
    mockAuthService.validateUser.mockResolvedValue(user);
    mockAuthService.login.mockReturnValue({ accessToken: 'signed.jwt.token' });

    const result = await controller.login({
      username: 'testuser',
      password: 'password',
    });

    expect(result).toEqual({ accessToken: 'signed.jwt.token' });
    expect(mockAuthService.validateUser).toHaveBeenCalledWith(
      'testuser',
      'password',
    );
  });

  it('should throw UnauthorizedException when credentials are invalid', async () => {
    mockAuthService.validateUser.mockResolvedValue(null);

    await expect(
      controller.login({ username: 'testuser', password: 'wrong' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
