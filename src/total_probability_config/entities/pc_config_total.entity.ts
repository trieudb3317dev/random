import { ProbabilityConfigEntity } from 'src/probability_config/entities/pc.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity('probability_config_totals')
export class ProbabilityConfigTotalEntity {
  @PrimaryGeneratedColumn()
  pc_toal_id: number;

  @Column({ nullable: false, default: 0 })
  pc_used: number;

  @Column({ nullable: false, default: 100 })
  pc_total: number;

  @OneToMany(() => ProbabilityConfigEntity, (pc) => pc.pc_total, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  pcs: ProbabilityConfigEntity[];

  @Column({ type: 'boolean', default: false, nullable: true })
  is_active: boolean;
}
