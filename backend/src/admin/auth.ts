import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

export interface AdminUser {
  sub: number;
  username: string;
}

export type AdminRequest = Request & { admin: AdminUser };

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private jwt: JwtService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AdminRequest>();
    const header = req.headers.authorization ?? '';
    const [type, token] = header.split(' ');
    if (type !== 'Bearer' || !token) throw new UnauthorizedException();
    try {
      req.admin = await this.jwt.verifyAsync<AdminUser>(token);
      return true;
    } catch {
      throw new UnauthorizedException('Session expired, please log in again');
    }
  }
}
