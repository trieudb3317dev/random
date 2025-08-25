import { UserAdminEntity } from 'src/admin/entities/user-admin.entity';
import {
  Column,
  Entity,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  Timestamp,
} from 'typeorm';

@Entity('history')
export class HistoryEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => UserAdminEntity, (userAdmin) => userAdmin.history, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  history_admin_id: UserAdminEntity;

  @Column({ nullable: false })
  history_time: Date;

  @Column({ nullable: false })
  history_result: string;

  @Column({ type: 'boolean', default: false })
  is_active: boolean;
}
