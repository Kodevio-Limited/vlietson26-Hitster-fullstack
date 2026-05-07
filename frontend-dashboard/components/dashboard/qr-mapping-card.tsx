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
        <button
            type="button"
            className="dashboard-card h-55 w-full p-6 text-left"
            onClick={onShowQr}
            title="Tap to view QR code"
        >
            <div className="flex items-start justify-between">
                <div className="flex items-end gap-3">
                    <span className="dashboard-chip-warning flex size-12.5 items-center justify-center rounded-[10px]">
                        <QrCode className="size-4.5" />
                    </span>

                    <div className="leading-normal">
                        <p className="text-[12px] text-[color:var(--dashboard-muted)]">QR code id</p>
                        <p className="text-[20px] font-semibold leading-[1.2] text-[color:var(--dashboard-ink)]">{qrCodeId}</p>
                    </div>
                </div>

                <span
                    className="dashboard-chip-danger flex size-9 items-center justify-center rounded-[20px]"
                    role="button"
                    aria-label={`Delete mapping ${qrCodeId}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete?.();
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.stopPropagation();
                            onDelete?.();
                        }
                    }}
                    tabIndex={0}
                >
                    <Trash2 className="size-5" />
                </span>
            </div>

            <div className="dashboard-card-soft mt-5 rounded-[16px] px-5 py-3 leading-normal">
                <p className="text-[12px] text-[color:var(--dashboard-muted)]">Mapped Song</p>
                <p className="text-[20px] font-semibold leading-[1.2] text-[color:var(--dashboard-ink)]">{songTitle}</p>
                <p className="text-[12px] text-[color:var(--dashboard-muted)]">{artist}</p>
            </div>
            <p className="mt-3 text-[10px] leading-normal text-[color:var(--dashboard-muted)]">
                Tap to view QR code.
            </p>
        </button>
    );
}
