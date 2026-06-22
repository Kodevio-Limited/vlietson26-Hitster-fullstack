import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
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
// Partial unique index: at most one *active* mapping per QR code.
//
// Two complementary invariants are enforced here:
//   1. `@Index(['songId', 'qrCodeId'], { unique: true })` above blocks
//      the same (song, qr) pair from being mapped twice, ever.
//   2. This index blocks two *active* mappings on the same QR
//      regardless of song. The QR-scan hot path in
//      `getActiveMappingByQrCodeId` filters `isActive = true` on every
//      call, so the partial index turns the lookup into a single
//      index probe instead of a seqscan over the (songId, qrCodeId)
//      composite followed by a per-row filter.
//
// The `where` clause is raw SQL passed through to `CREATE INDEX`. The
// column name is `is_active` (the DB name from `@Column({ name: ... })`),
// not the entity field `isActive` — TypeORM does not translate the
// predicate, only the indexed columns.
//
// Migration: TypeORM's `synchronize: true` (dev) auto-creates this on
// next boot. Prod needs a real migration — see CLAUDE.md "Pre-existing
// backend lint debt / no migrations folder" note.
@Index(['qrCodeId'], { unique: true, where: '"is_active" = TRUE' })
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

  @ManyToOne(() => Song, (song) => song.mappings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'song_id' })
  song: Song;

  @ManyToOne(() => QrCode, (qrCode) => qrCode.mappings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'qr_code_id' })
  qrCode: QrCode;

  @ManyToOne(() => QrCard, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'qr_card_id' })
  qrCard: QrCard;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;
}
