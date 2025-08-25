import { Module } from '@nestjs/common';
import { UserAdminEntity } from 'src/admin/entities/user-admin.entity';
import { ProbabilityConfigTotalEntity } from './entities/pc_config_total.entity';

@Module({
  imports: [UserAdminEntity, ProbabilityConfigTotalEntity],
  controllers: [],
  providers: [],
  exports: [ProbabilityConfigTotalEntity],
})
export class PcConfigTotalModule {}
