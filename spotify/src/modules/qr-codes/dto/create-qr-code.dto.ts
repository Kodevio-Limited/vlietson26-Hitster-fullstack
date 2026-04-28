import { IsString, IsNotEmpty, IsUrl, IsOptional } from 'class-validator';

export class CreateQrCodeDto {
  @IsUrl()
  @IsOptional()
  @IsNotEmpty()
  spotifyUrl?: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  spotifyTrackId?: string;

  @IsString()
  @IsNotEmpty()
  identifier: string;
}
