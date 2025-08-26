import { UserAdminEntity } from 'src/admin/entities/user-admin.entity';
import { Column, Entity, ManyToOne, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity('probability_config_finals')
export class ProbabilityConfigFinalEntity {
  @PrimaryGeneratedColumn()
  pc_fianl_id: number;

  @Column({ nullable: false })
  pc_value: string;

  @Column({ nullable: false, default: 0, type: 'float' })
  pc_percent: number;

  @Column({ type: 'boolean', default: false, nullable: true })
  is_active: boolean;
}
