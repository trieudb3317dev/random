import { UserAdminEntity } from 'src/admin/entities/user-admin.entity';
import { ProbabilityConfigTotalEntity } from 'src/total_probability_config/entities/pc_config_total.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity('probability_configs')
export class ProbabilityConfigEntity {
  @PrimaryGeneratedColumn()
  pc_id: number;

  @Column({ nullable: false })
  pc_value: string;

  @Column({ nullable: false })
  pc_percent: number;

  @ManyToOne(() => UserAdminEntity, (userAdmin) => userAdmin.id, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  pc_admin_id: UserAdminEntity;

  @ManyToOne(() => ProbabilityConfigTotalEntity, (pc_total) => pc_total.pcs, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  pc_total: ProbabilityConfigTotalEntity;

  @Column({ type: 'boolean', default: false, nullable: true })
  is_active: boolean;
}
