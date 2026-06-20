import { IsString, IsOptional, IsUrl, MaxLength, MinLength, Matches } from 'class-validator';

/**
 * Body for PATCH /auth/update-profile. The previous inline-untyped body
 * accepted any value for `imageUrl`, including arbitrary URLs or multi-MB
 * base64 blobs. Validate size, type, and length before storing.
 */
export class UpdateProfileDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000_000, { message: 'imageUrl too large; max ~1.5MB base64' })
  // Accept either a remote URL or a data: URL for inline base64 avatars.
  // The base64 payload (after the data: prefix) is enforced by the regex.
  @Matches(
    /^(https?:\/\/[^\s]+|data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]{1,2_000_000})$/,
    { message: 'imageUrl must be a valid URL or data: image base64 string' },
  )
  imageUrl?: string;
}
