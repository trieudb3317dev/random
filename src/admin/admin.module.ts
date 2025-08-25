import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProbabilityConfigEntity } from 'src/probability_config/entities/pc.entity';
import { HistoryEntity } from 'src/history/entities/history.entity';
import { UserAdminEntity } from './entities/user-admin.entity';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtAuthAdminStrategy } from './strategies/jwt.strategy';
import { ProbabilityConfigTotalEntity } from 'src/total_probability_config/entities/pc_config_total.entity';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt-admin' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '3600'),
        },
      }),
    }),
    TypeOrmModule.forFeature([
      ProbabilityConfigEntity,
      HistoryEntity,
      UserAdminEntity,
      ProbabilityConfigTotalEntity
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService, JwtService, JwtAuthAdminStrategy],
})
export class AdminModule {}
