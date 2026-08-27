import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { useTranslation } from "react-i18next";
import Button from "../ui/Button";
import { getTheme } from "../../lib/pairing-themes";
import type { PairingInvitation } from "../../lib/types";

interface Props {
  invitation: PairingInvitation;
  creatorName: string;
}

const CARD_W = 320;
const CARD_H = 420;
const QR_SIZE = 200;

export default function PairingInviteCard({ invitation, creatorName }: Props) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const theme = getTheme(invitation.theme);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, invitation.share_url, {
      width: QR_SIZE, margin: 2, color: { dark: theme.qrDark, light: "#FFFFFF" },
    }).catch(() => {});
  }, [invitation.share_url, theme.qrDark]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(invitation.share_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (permissions/context) - the link is also shown as selectable text.
    }
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: t("pairing.invite.headline", { name: creatorName }), url: invitation.share_url });
      } catch {
        // User cancelled the native share sheet.
      }
    } else {
      copyLink();
    }
  }

  function download() {
    if (!canvasRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = CARD_W;
    canvas.height = CARD_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gradient = ctx.createLinearGradient(0, 0, 0, CARD_H);
    gradient.addColorStop(0, theme.bgFrom);
    gradient.addColorStop(1, theme.bgTo);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CARD_W, CARD_H);
    ctx.strokeStyle = theme.border;
    ctx.lineWidth = 3;
    ctx.strokeRect(6, 6, CARD_W - 12, CARD_H - 12);

    ctx.textAlign = "center";
    ctx.fillStyle = "#2A2622";
    ctx.font = "600 19px Georgia, serif";
    wrapText(ctx, t("pairing.invite.headline", { name: creatorName }), CARD_W / 2, 48, CARD_W - 48, 24);

    // A solid white tile behind the QR keeps its quiet zone intact regardless of theme background.
    const qrX = (CARD_W - QR_SIZE) / 2;
    const qrY = 90;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(qrX - 14, qrY - 14, QR_SIZE + 28, QR_SIZE + 28);
    ctx.drawImage(canvasRef.current, qrX, qrY, QR_SIZE, QR_SIZE);

    ctx.fillStyle = "#6B6459";
    ctx.font = "14px sans-serif";
    ctx.fillText(t("pairing.invite.scanHint"), CARD_W / 2, qrY + QR_SIZE + 44);

    if (theme.corner) {
      ctx.font = "26px serif";
      ctx.fillText(theme.corner, 34, 38);
      ctx.fillText(theme.corner, CARD_W - 34, 38);
      ctx.fillText(theme.corner, 34, CARD_H - 22);
      ctx.fillText(theme.corner, CARD_W - 34, CARD_H - 22);
    }

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "hadiya-pairing-invite.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <div
      className="mx-auto flex flex-col items-center gap-4 rounded-[var(--radius-card)] border-2 p-6 text-center"
      style={{ background: `linear-gradient(to bottom, ${theme.bgFrom}, ${theme.bgTo})`, borderColor: theme.border, maxWidth: CARD_W }}
    >
      {theme.corner && (
        <div className="flex w-full justify-between text-2xl" aria-hidden="true">
          <span>{theme.corner}</span>
          <span>{theme.corner}</span>
        </div>
      )}

      <p className="font-display text-lg font-semibold text-ink">{t("pairing.invite.headline", { name: creatorName })}</p>

      <div className="rounded-[var(--radius-control)] bg-white p-3 shadow-[var(--shadow-lift)]">
        <canvas ref={canvasRef} width={QR_SIZE} height={QR_SIZE} />
      </div>

      <p className="text-sm text-ink-muted">{t("pairing.invite.scanHint")}</p>
      <p className="w-full break-all rounded-[var(--radius-control)] bg-surface px-3 py-2 font-mono text-xs text-ink-muted">{invitation.share_url}</p>

      {theme.corner && (
        <div className="flex w-full justify-between text-2xl" aria-hidden="true">
          <span>{theme.corner}</span>
          <span>{theme.corner}</span>
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={copyLink}>
          {copied ? t("pairing.invite.copied") : t("pairing.invite.copyLink")}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={download}>{t("pairing.invite.download")}</Button>
        <Button type="button" size="sm" onClick={share}>{t("pairing.invite.share")}</Button>
      </div>
    </div>
  );
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(" ");
  let line = "";
  let cursorY = y;
  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, cursorY);
      line = word;
      cursorY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, cursorY);
}
