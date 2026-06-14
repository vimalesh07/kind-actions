import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function QrCodeImage({ payload, size = 220 }: { payload: object | string; size?: number }) {
  const [src, setSrc] = useState<string>("");
  useEffect(() => {
    const data = typeof payload === "string" ? payload : JSON.stringify(payload);
    QRCode.toDataURL(data, {
      width: size,
      margin: 1,
      color: { dark: "#800000", light: "#FFFFFF" },
      errorCorrectionLevel: "M",
    }).then(setSrc).catch(() => setSrc(""));
  }, [payload, size]);

  if (!src) return <div style={{ width: size, height: size }} className="rounded-lg bg-muted animate-pulse" />;
  return <img src={src} width={size} height={size} alt="QR code" className="rounded-lg bg-white p-2" />;
}
