import { Repository } from 'typeorm';
import { Mapping } from './entities/mapping.entity';
import { CreateMappingDto } from './dto/create-mapping.dto';
import { SongsService } from '../songs/songs.service';
import { QrCodesService } from '../qr-codes/qr-codes.service';
import { QrCardsService } from '../qr-cards/qr-cards.service';
import { NotificationsService } from '../notifications/notifications.service';
export declare class MappingsService {
    private readonly mappingRepository;
    private readonly songsService;
    private readonly qrCodesService;
    private readonly qrCardsService;
    private readonly notificationsService;
    private readonly logger;
    constructor(mappingRepository: Repository<Mapping>, songsService: SongsService, qrCodesService: QrCodesService, qrCardsService: QrCardsService, notificationsService: NotificationsService);
    create(createMappingDto: CreateMappingDto, userId: string): Promise<Mapping>;
    update(id: string, updateMappingDto: Partial<CreateMappingDto>): Promise<Mapping>;
    findAll(page?: number, limit?: number): Promise<{
        items: Mapping[];
        total: number;
    }>;
    findOne(id: string): Promise<Mapping>;
    findByQrCard(cardId: string): Promise<Mapping[]>;
    findBySong(songId: string): Promise<Mapping[]>;
    deactivate(id: string): Promise<Mapping>;
    remove(id: string): Promise<void>;
    getActiveMappingByQrIdentifier(identifier: string): Promise<Mapping | null>;
}
