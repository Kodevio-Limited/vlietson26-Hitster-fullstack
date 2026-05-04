import { PartialType } from '@nestjs/mapped-types';
import { CreateQrCardDto } from './create-qr-card.dto';
import { IsString, IsOptional } from 'class-validator';

export class UpdateQrCardDto extends PartialType(CreateQrCardDto) {
  @IsString()
  @IsOptional()
  status?: string;
}
