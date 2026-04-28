import { QrCode, Trash2 } from "lucide-react";

type QrMappingCardProps = {
    qrCodeId: string;
    songTitle: string;
    artist: string;
    qrImageUrl?: string;
    onShowQr?: () => void;
    onDelete?: () => void;
};

export function QrMappingCard({ qrCodeId, songTitle, artist, qrImageUrl, onShowQr, onDelete }: QrMappingCardProps) {
    return (
        <article className="dashboard-card h-55 p-6">
            <div className="flex items-start justify-between">
                <div className="flex items-end gap-3">
                    <button
                        type="button"
                        onClick={onShowQr}
                        title="Tap to get QR code"
                        className="dashboard-chip-warning flex size-12.5 items-center justify-center rounded-[10px]"
                        aria-label={`Show QR code for ${qrCodeId}`}
                    >
                        <QrCode className="size-4.5" />
                    </button>

                    <div className="leading-normal">
                        <p className="text-[12px] text-[color:var(--dashboard-muted)]">QR code id</p>
                        <p className="text-[20px] font-semibold leading-[1.2] text-[color:var(--dashboard-ink)]">{qrCodeId}</p>
                    </div>
                </div>

                <button
                    type="button"
                    aria-label={`Delete mapping ${qrCodeId}`}
                    className="dashboard-chip-danger flex size-9 items-center justify-center rounded-[20px]"
                    onClick={onDelete}
                >
                    <Trash2 className="size-5" />
                </button>
            </div>

            <div className="dashboard-card-soft mt-5 rounded-[16px] px-5 py-3 leading-normal">
                <p className="text-[12px] text-[color:var(--dashboard-muted)]">Mapped Song</p>
                <p className="text-[20px] font-semibold leading-[1.2] text-[color:var(--dashboard-ink)]">{songTitle}</p>
                <p className="text-[12px] text-[color:var(--dashboard-muted)]">{artist}</p>
            </div>
            <p className="mt-3 text-[10px] leading-normal text-[color:var(--dashboard-muted)]">
                Tap the yellow QR icon to get this QR code.
            </p>
        </article>
    );
}
