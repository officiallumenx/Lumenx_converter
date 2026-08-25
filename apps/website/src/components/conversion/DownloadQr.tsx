import QRCode from "react-qr-code";

export function DownloadQr({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <figure className="download-qr">
      <div className="download-qr__code">
        <QRCode value={value} size={128} level="M" bgColor="#ffffff" fgColor="#111827" />
      </div>
      <figcaption className="download-qr__caption">{label}</figcaption>
    </figure>
  );
}
