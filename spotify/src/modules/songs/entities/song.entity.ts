import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm';
import { Mapping } from '../../mappings/entities/mapping.entity';

@Entity('songs')
@Index(['name', 'artist'])
@Index(['createdAt'])
@Index(['spotifyTrackId'])
@Index(['plays', 'createdAt'])
export class Song {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  artist: string;

  @Column({ type: 'integer', name: 'release_year' })
  releaseYear: number;

  @Column({ type: 'varchar', length: 255, unique: true, name: 'spotify_track_id' })
  spotifyTrackId: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'spotify_url' })
  spotifyUrl: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'album_image_url' })
  albumImageUrl: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'preview_url' })
  previewUrl: string;

  @Column({ type: 'integer', default: 0 })
  plays: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Mapping, (mapping) => mapping.song)
  mappings: Mapping[];
}
