import { QrCodesService } from './qr-codes.service';
import { CreateQrCodeDto } from './dto/create-qr-code.dto';
export declare class QrCodesController {
    private readonly qrCodesService;
    constructor(qrCodesService: QrCodesService);
    generate(createQrCodeDto: CreateQrCodeDto): Promise<{
        success: boolean;
        message: string;
        data: import("./entities/qr-code.entity").QrCode;
    }>;
    findAll(): Promise<{
        success: boolean;
        count: number;
        data: import("./entities/qr-code.entity").QrCode[];
    }>;
    getStats(): Promise<{
        success: boolean;
        data: any;
    }>;
    findOne(id: string): Promise<{
        success: boolean;
        data: import("./entities/qr-code.entity").QrCode;
    }>;
    deactivate(id: string): Promise<{
        success: boolean;
        message: string;
        data: import("./entities/qr-code.entity").QrCode;
    }>;
    activate(id: string): Promise<{
        success: boolean;
        message: string;
        data: import("./entities/qr-code.entity").QrCode;
    }>;
    remove(id: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
