import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { JwtPayload } from './jwt-payload';

@Injectable()
export class AuthService {
  private readonly tokenBlacklist = new Set<string>();
  private readonly jwtSecret: jwt.Secret;
  private readonly jwtExpiresIn: jwt.SignOptions['expiresIn'];

  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {
    this.jwtSecret =
      this.configService.get<string>('JWT_SECRET') || 'issueflow_jwt_secret';
    this.jwtExpiresIn =
      (this.configService.get<string>(
        'JWT_EXPIRES_IN',
      ) as jwt.SignOptions['expiresIn']) || '1h';
  }

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

  login(user: Omit<User, 'password'>): { accessToken: string } {
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };
    const accessToken = jwt.sign(payload as object, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn,
    } as jwt.SignOptions);
    return { accessToken };
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
      const payload = jwt.verify(token, this.jwtSecret);
      if (
        typeof payload === 'string' ||
        !payload ||
        typeof payload !== 'object'
      ) {
        throw new UnauthorizedException(
          'Invalid or expired authorization token',
        );
      }
      return payload as unknown as JwtPayload;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired authorization token');
    }
  }
}
