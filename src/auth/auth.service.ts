import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { JwtPayload } from '../common/constants/jwt-payload';

@Injectable()
export class AuthService {
  private readonly tokenBlacklist = new Set<string>();

  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(
    username: string,
    password: string,
  ): Promise<Omit<User, 'password'> | null> {
    const user = await this.usersService.findByUsername(username);
    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    const { password: _password, ...result } = user;
    void _password;
    return result as Omit<User, 'password'>;
  }

  login(user: Omit<User, 'password'>) {
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };

    const expiresInConfig =
      this.configService.get<string>('JWT_EXPIRES_IN') || '1h';
    const expiresInSeconds = expiresInConfig === '1h' ? 3600 : 3600;

    return {
      accessToken: this.jwtService.sign(payload),
      tokenType: 'Bearer',
      expiresIn: expiresInSeconds,
    };
  }

  logout(token: string): void {
    if (token) {
      this.tokenBlacklist.add(token);
    }
  }

  isTokenBlacklisted(token: string): boolean {
    return this.tokenBlacklist.has(token);
  }

  verifyToken(token: string): JwtPayload {
    try {
      const payload = this.jwtService.verify(token);
      if (!payload || typeof payload !== 'object') {
        throw new UnauthorizedException(
          'Invalid or expired authorization token',
        );
      }
      return payload as JwtPayload;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired authorization token');
    }
  }
}
