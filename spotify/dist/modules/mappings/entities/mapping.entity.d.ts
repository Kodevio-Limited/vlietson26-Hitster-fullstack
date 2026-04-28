import { Song } from '../../songs/entities/song.entity';
import { QrCode } from '../../qr-codes/entities/qr-code.entity';
import { QrCard } from '../../qr-cards/entities/qr-card.entity';
import { User } from '../../auth/entities/user.entity';
export declare class Mapping {
    id: string;
    songId: string;
    qrCodeId: string;
    qrCardId: string;
    createdById: string;
    isActive: boolean;
    createdAt: Date;
    song: Song;
    qrCode: QrCode;
    qrCard: QrCard;
    createdBy: User;
}
