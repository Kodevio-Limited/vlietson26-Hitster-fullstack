import { IsString, IsNotEmpty } from 'class-validator';

export class SpotifyLoginDto {
  @IsString()
  @IsNotEmpty()
  code: string;
}
