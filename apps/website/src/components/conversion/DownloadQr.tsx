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
      <a
        href={value}
        className="download-qr__code"
        aria-label={label}
        title={value}
      >
        <QRCode value={value} size={128} level="M" bgColor="#ffffff" fgColor="#111827" />
      </a>
      <figcaption className="download-qr__caption">{label}</figcaption>
    </figure>
  );
}
