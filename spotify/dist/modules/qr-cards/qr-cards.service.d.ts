import { Repository } from 'typeorm';
import { QrCard } from './entities/qr-card.entity';
import { CreateQrCardDto } from './dto/create-qr-card.dto';
import { UpdateQrCardDto } from './dto/update-qr-card.dto';
export declare class QrCardsService {
    private readonly qrCardRepository;
    private readonly logger;
    constructor(qrCardRepository: Repository<QrCard>);
    create(createDto: CreateQrCardDto): Promise<QrCard>;
    findAll(): Promise<QrCard[]>;
    findOne(id: string): Promise<QrCard>;
    findByCardId(cardId: string): Promise<QrCard>;
    update(id: string, updateDto: UpdateQrCardDto): Promise<QrCard>;
    remove(id: string): Promise<void>;
    getAvailableCards(): Promise<QrCard[]>;
}
