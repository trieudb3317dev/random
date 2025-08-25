import { Column, Entity, PrimaryGeneratedColumn, Timestamp } from 'typeorm';

@Entity('history')
export class HistoryEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false })
  history_admin_id: number;

  @Column({ nullable: false })
  history_time: Date;

  @Column({ nullable: false })
  history_result: string;

  @Column({ type: 'boolean', default: false })
  is_active: boolean;
}
