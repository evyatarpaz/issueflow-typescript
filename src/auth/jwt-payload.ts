import { Role } from '../users/entities/user.entity';

export interface JwtPayload {
  sub: number;
  username: string;
  role: Role;
}
