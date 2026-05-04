import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { QrCode } from './entities/qr-code.entity';
import { CreateQrCodeDto } from './dto/create-qr-code.dto';
export declare class QrCodesService {
    private readonly qrCodeRepository;
    private readonly configService;
    private readonly logger;
    constructor(qrCodeRepository: Repository<QrCode>, configService: ConfigService);
    generateQrCode(createDto: CreateQrCodeDto): Promise<QrCode>;
    findAll(): Promise<QrCode[]>;
    findOne(id: string): Promise<QrCode>;
    findByIdentifier(identifier: string): Promise<QrCode>;
    incrementScans(identifier: string): Promise<void>;
    deactivate(id: string): Promise<QrCode>;
    activate(id: string): Promise<QrCode>;
    remove(id: string): Promise<void>;
    getStats(): Promise<any>;
}
