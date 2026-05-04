import { Mapping } from '../../mappings/entities/mapping.entity';
export declare class QrCode {
    id: string;
    identifier: string;
    code: string;
    imageUrl: string;
    redirectUrl: string;
    isActive: boolean;
    scans: number;
    createdAt: Date;
    mappings: Mapping[];
}
