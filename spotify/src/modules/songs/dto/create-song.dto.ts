import { IsString, IsNotEmpty, IsInt, Min, Max } from 'class-validator';

export class CreateSongDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  artist: string;

  @IsInt()
  @Min(1900)
  @Max(new Date().getFullYear())
  releaseYear: number;

  @IsString()
  @IsNotEmpty()
  spotifyTrackId: string;
}
