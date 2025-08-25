import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { AdminService } from '../admin.service';
import { UserAdminEntity } from '../entities/user-admin.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtAuthAdminStrategy extends PassportStrategy(
  Strategy,
  'jwt-admin',
) {
  constructor(
    private readonly userAdminService: AdminService,
    private readonly configService: ConfigService,
  ) {
    super({
      jwtFromRequest: (req) => {
        let token = null;
        if (req && req.cookies) {
          token = req.cookies['access_token'];
        }
        return token;
      },
      ignoreExpiration: true,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: any): Promise<UserAdminEntity> {
    return this.userAdminService.validateAdmin(payload.email);
  }
}
