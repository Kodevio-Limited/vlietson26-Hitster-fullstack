import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Song } from '../../songs/entities/song.entity';
import { QrCode } from '../../qr-codes/entities/qr-code.entity';
import { QrCard } from '../../qr-cards/entities/qr-card.entity';
import { User } from '../../auth/entities/user.entity';

@Entity('mappings')
@Index(['songId', 'qrCodeId'], { unique: true })
@Index(['songId'])
@Index(['qrCodeId'])
@Index(['isActive'])
@Index(['createdAt'])
@Index(['createdById'])
export class Mapping {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'song_id', type: 'uuid' })
  songId: string;

  @Column({ name: 'qr_code_id', type: 'uuid' })
  qrCodeId: string;

  @Column({ name: 'qr_card_id', type: 'uuid', nullable: true })
  qrCardId: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdById: string;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Song, (song) => song.mappings)
  @JoinColumn({ name: 'song_id' })
  song: Song;

  @ManyToOne(() => QrCode, (qrCode) => qrCode.mappings)
  @JoinColumn({ name: 'qr_code_id' })
  qrCode: QrCode;

  @ManyToOne(() => QrCard)
  @JoinColumn({ name: 'qr_card_id' })
  qrCard: QrCard;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;
}
