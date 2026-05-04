import { QrCardsService } from './qr-cards.service';
import { CreateQrCardDto } from './dto/create-qr-card.dto';
import { UpdateQrCardDto } from './dto/update-qr-card.dto';
export declare class QrCardsController {
    private readonly qrCardsService;
    constructor(qrCardsService: QrCardsService);
    create(createQrCardDto: CreateQrCardDto): Promise<{
        success: boolean;
        message: string;
        data: import("./entities/qr-card.entity").QrCard;
    }>;
    findAll(): Promise<{
        success: boolean;
        count: number;
        data: import("./entities/qr-card.entity").QrCard[];
    }>;
    getAvailable(): Promise<{
        success: boolean;
        data: import("./entities/qr-card.entity").QrCard[];
    }>;
    findOne(id: string): Promise<{
        success: boolean;
        data: import("./entities/qr-card.entity").QrCard;
    }>;
    update(id: string, updateQrCardDto: UpdateQrCardDto): Promise<{
        success: boolean;
        message: string;
        data: import("./entities/qr-card.entity").QrCard;
    }>;
    remove(id: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
