import { IsString, IsNotEmpty, IsUrl, IsOptional, Matches, MaxLength } from 'class-validator';

export class CreateQrCodeDto {
  @IsUrl()
  @IsOptional()
  @IsNotEmpty()
  @MaxLength(500)
  spotifyUrl?: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  @Matches(/^[A-Za-z0-9]{22}$/, {
    message: 'spotifyTrackId must be a 22-character Spotify track ID',
  })
  spotifyTrackId?: string;

  @IsString()
  @IsNotEmpty()
  // The identifier is embedded into the redirect URL and used in
  // unvalidated path params; restrict to URL-safe characters to prevent
  // log injection and open-redirect payloads.
  @Matches(/^[a-zA-Z0-9_-]{1,50}$/, {
    message: 'identifier must be 1-50 chars, letters/digits/_- only',
  })
  identifier: string;
}