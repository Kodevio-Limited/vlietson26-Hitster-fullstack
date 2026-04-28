import { Mapping } from '../../mappings/entities/mapping.entity';
export declare class Song {
    id: string;
    name: string;
    artist: string;
    releaseYear: number;
    spotifyTrackId: string;
    spotifyUrl: string;
    albumImageUrl: string;
    previewUrl: string;
    plays: number;
    createdAt: Date;
    updatedAt: Date;
    mappings: Mapping[];
}
