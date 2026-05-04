import { CreateQrCardDto } from './create-qr-card.dto';
declare const UpdateQrCardDto_base: import("@nestjs/mapped-types").MappedType<Partial<CreateQrCardDto>>;
export declare class UpdateQrCardDto extends UpdateQrCardDto_base {
    status?: string;
}
export {};
