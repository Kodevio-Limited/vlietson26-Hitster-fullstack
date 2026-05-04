import { songsData } from "./songs-data";

export const qrMappingData = songsData.slice(0, 8).map((song, index) => ({
    qrCodeId: `CARD_${String(index + 1).padStart(3, "0")}`,
    songTitle: song.songName,
    artist: song.ArtistName,
}));
