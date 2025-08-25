import { Module } from '@nestjs/common';
import { HistoryController } from './history.controller';
import { HistoryService } from './history.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HistoryEntity } from './entities/history.entity';
import { UserAdminEntity } from 'src/admin/entities/user-admin.entity';

@Module({
  imports: [TypeOrmModule.forFeature([HistoryEntity, UserAdminEntity])],
  controllers: [HistoryController],
  providers: [HistoryService],
})
export class HistoryModule {}
