import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, OneToMany, Index } from 'typeorm';
import { Mapping } from '../../mappings/entities/mapping.entity';

@Entity('qr_codes')
@Index(['createdAt'])
@Index(['isActive'])
export class QrCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  @Index()
  identifier: string;

  @Column({ type: 'text' })
  code: string;

  @Column({ type: 'text', name: 'image_url', nullable: true, select: false })
  imageUrl: string;

  @Column({ type: 'varchar', length: 500, name: 'redirect_url' })
  redirectUrl: string;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'integer', default: 0 })
  scans: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => Mapping, (mapping) => mapping.qrCode)
  mappings: Mapping[];
}
