import { IsString, IsOptional, IsInt, Min, IsIn, IsEnum, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

// Allow-list of columns that may be used in ORDER BY. Anything else
// (including sensitive columns) is rejected by the global ValidationPipe.
export const SONG_SORTABLE_COLUMNS = [
  'name',
  'artist',
  'createdAt',
  'plays',
  'releaseYear',
] as const;

export class SearchSongDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  q?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  // Defense-in-depth: cap server-side in case the client ignores the
  // default. The controller additionally clamps via Math.min.
  @IsOptional()
  limit?: number = 10;

  @IsString()
  @IsOptional()
  @IsIn([...SONG_SORTABLE_COLUMNS])
  sortBy?: (typeof SONG_SORTABLE_COLUMNS)[number] = 'createdAt';

  @IsEnum(['ASC', 'DESC'])
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
