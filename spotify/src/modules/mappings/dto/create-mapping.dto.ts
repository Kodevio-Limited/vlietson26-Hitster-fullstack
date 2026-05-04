import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class CreateMappingDto {
  @IsUUID()
  @IsNotEmpty()
  songId: string;

  @IsUUID()
  @IsNotEmpty()
  qrCodeId: string;

  @IsUUID()
  @IsOptional()
  qrCardId?: string;
}
