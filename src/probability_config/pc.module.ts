import { Module } from '@nestjs/common';
import { ProbabilityConfigController } from './pc.controller';
import { ProbabilityConfigService } from './pc.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserAdminEntity } from 'src/admin/entities/user-admin.entity';
import { AdminModule } from 'src/admin/admin.module';
import { ProbabilityConfigEntity } from './entities/pc.entity';
import { ProbabilityConfigFinalEntity } from 'src/total_probability_config/entities/pc_config_final.entity';
import { HistoryEntity } from 'src/history/entities/history.entity';
import { JwtAuthAdminGuard } from 'src/admin/guards/jwt-auth-admin.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserAdminEntity,
      ProbabilityConfigEntity,
      ProbabilityConfigFinalEntity,
      HistoryEntity,
    ]),
    AdminModule,
  ],
  controllers: [ProbabilityConfigController],
  providers: [ProbabilityConfigService, JwtAuthAdminGuard],
  exports: [ProbabilityConfigService],
})
export class ProbabilityConfigModule {}
