import { UserAdminEntity } from 'src/admin/entities/user-admin.entity';
import {
  Column,
  Entity,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  Timestamp,
} from 'typeorm';

export enum StatusEnum {
  NONE = '',
  SPIN = 'spin',
  DELETED = 'deleted',
  CREATED = 'created',
  UPDATED = 'updated',
  CHECKED = 'checked',
  AUTH = 'auth'
}

@Entity('history')
export class HistoryEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => UserAdminEntity, (userAdmin) => userAdmin.history, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  history_admin_id: UserAdminEntity;

  @Column({ nullable: false })
  history_time: Date;

  @Column({ nullable: false })
  history_result: string;

  @Column({
    type: 'enum',
    enum: StatusEnum,
    default: StatusEnum.NONE,
    nullable: false,
  })
  status: StatusEnum;

  @Column({ type: 'boolean', default: false })
  is_active: boolean;
}
