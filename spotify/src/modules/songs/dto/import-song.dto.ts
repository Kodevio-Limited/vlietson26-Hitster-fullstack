import { IsString, IsNotEmpty } from 'class-validator';

export class ImportSongDto {
  @IsString()
  @IsNotEmpty()
  spotifyUrl: string;
}
