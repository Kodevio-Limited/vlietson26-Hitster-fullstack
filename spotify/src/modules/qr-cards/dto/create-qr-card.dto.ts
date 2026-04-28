import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class CreateQrCardDto {
  @IsString()
  @IsNotEmpty()
  cardId: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
