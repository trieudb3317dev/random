import { Module } from '@nestjs/common';
import { HistoryController } from './history.controller';
import { HistoryService } from './history.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HistoryEntity } from './entities/history.entity';
import { UserAdminEntity } from 'src/admin/entities/user-admin.entity';
import { AdminModule } from 'src/admin/admin.module';
import { ProbabilityConfigService } from 'src/probability_config/pc.service';
import { JwtAuthAdminStrategy } from 'src/admin/strategies/jwt.strategy';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [
    TypeOrmModule.forFeature([HistoryEntity, UserAdminEntity]),
    AdminModule,
  ],
  controllers: [HistoryController],
  providers: [HistoryService, JwtAuthAdminStrategy, JwtService],
})
export class HistoryModule {}
