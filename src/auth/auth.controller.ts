import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiProperty,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

class LoginResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken!: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType!: string;

  @ApiProperty({ example: 3600 })
  expiresIn!: number;
}

/**
 * Defines the HTTP transport layer for Identity & Access Management (IAM).
 * This controller serves as the system's entry point for establishing and terminating
 * secure sessions, delegating core cryptographic token issuance to the AuthService.
 */
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Evaluates client credentials and establishes a trusted session.
   * We utilize POST instead of GET for login to ensure sensitive credentials
   * are transported strictly within the encrypted HTTP request body, avoiding URL logging.
   *
   * @param loginDto - The validated payload containing the username and plaintext password.
   * @returns A secure JWT payload allowing stateless authentication on subsequent requests.
   * @throws {UnauthorizedException} When credentials fail cryptographic verification.
   */
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'User login to receive JWT token' })
  @ApiResponse({
    status: 200,
    description: 'Successfully authenticated',
    type: LoginResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid username or password' })
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(
      loginDto.username,
      loginDto.password,
    );
    if (!user) {
      throw new UnauthorizedException('Invalid username or password');
    }
    return this.authService.login(user);
  }

  /**
   * Terminates the current active session by explicitly blacklisting the associated JWT.
   * While JWTs are inherently stateless, business constraints dictate the ability to forcibly
   * revoke access (e.g., security breaches or explicit user action) before natural expiration.
   *
   * @param request - The raw express request, necessary to extract the exact bearer token string for blacklisting.
   * @throws {UnauthorizedException} If the authorization header is malformed or missing.
   */
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Log out current user and invalidate token' })
  @ApiResponse({ status: 200, description: 'Successfully logged out' })
  logout(@Req() request: Request): void {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('Authorization header missing');
    }
    const bearer = authHeader.split(' ');
    const token = bearer.length === 2 ? bearer[1] : null;
    if (!token) {
      throw new UnauthorizedException('Invalid authorization header');
    }
    this.authService.logout(token);
    return;
  }

  /**
   * Resolves the identity of the currently authenticated caller.
   * Utilizes the @CurrentUser decorator to extract identity metadata seamlessly from
   * the request context, which was populated upstream by the JwtAuthGuard during token resolution.
   *
   * @param user - The decoded user metadata injected by the custom decorator.
   * @returns The caller's identity context.
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authorized user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  getProfile(@CurrentUser() user: any) {
    return user;
  }
}
