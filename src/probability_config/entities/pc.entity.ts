import { UserAdminEntity } from 'src/admin/entities/user-admin.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity('probability_configs')
export class ProbabilityConfigEntity {
  @PrimaryGeneratedColumn()
  pc_id: number;

  @Column({ nullable: false })
  pc_value: string;

  @Column({ nullable: false })
  pc_percent: number;

  @Column({ nullable: false, default: 0 })
  pc_used: number;

  @Column({ nullable: false, default: 100 })
  pc_total: number;

  @ManyToOne(() => UserAdminEntity, (userAdmin) => userAdmin.id, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  pc_admin_id: UserAdminEntity;

  @Column({ type: 'boolean', default: false, nullable: true })
  is_active: boolean;
}
