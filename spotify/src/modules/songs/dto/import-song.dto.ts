import { IsString, IsNotEmpty, IsUrl } from 'class-validator';

export class ImportSongDto {
  @IsString()
  @IsNotEmpty()
  spotifyUrl: string;
}
