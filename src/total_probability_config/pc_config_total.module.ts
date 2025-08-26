import { Module } from '@nestjs/common';
import { UserAdminEntity } from 'src/admin/entities/user-admin.entity';
import { ProbabilityConfigFinalEntity } from './entities/pc_config_final.entity';

@Module({
  imports: [UserAdminEntity, ProbabilityConfigFinalEntity],
  controllers: [],
  providers: [],
  exports: [],
})
export class PcConfigFinalModule {}
