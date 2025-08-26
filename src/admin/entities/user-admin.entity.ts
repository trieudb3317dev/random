import { HistoryEntity } from 'src/history/entities/history.entity';
import { ProbabilityConfigEntity } from 'src/probability_config/entities/pc.entity';
import { ProbabilityConfigTotalEntity } from 'src/total_probability_config/entities/pc_config_total.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  Timestamp,
  UpdateDateColumn,
} from 'typeorm';

export enum UserAdminRole {
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
}

export enum UserAdminStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Entity('user_admins')
export class UserAdminEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 50, nullable: false })
  email: string;

  @Column({ unique: true, nullable: false })
  password: string;

  @Column({
    type: 'enum',
    enum: UserAdminRole,
    default: UserAdminRole.ADMIN,
    nullable: false,
  })
  role: UserAdminRole;

  @Column({
    type: 'enum',
    enum: UserAdminStatus,
    default: UserAdminStatus.ACTIVE,
    nullable: false,
  })
  status: UserAdminStatus;

  @OneToMany(() => ProbabilityConfigEntity, (pc) => pc.pc_admin_id, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  pc_configs: ProbabilityConfigEntity[];

  @OneToMany(
    () => ProbabilityConfigTotalEntity,
    (pcTotal) => pcTotal.pc_total_admin,
    {
      nullable: true,
      onDelete: 'CASCADE',
    },
  )
  pc_totals: ProbabilityConfigTotalEntity[];

  @OneToMany(() => HistoryEntity, (history) => history.history_admin_id, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  history: HistoryEntity[];

  @CreateDateColumn()
  createdAt: Timestamp;

  @UpdateDateColumn()
  updatedAt: Timestamp;
}
