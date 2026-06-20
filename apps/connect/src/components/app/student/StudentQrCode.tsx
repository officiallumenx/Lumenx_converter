import { SafeQrCode } from "@/components/app/id-card/SafeQrCode";

type StudentQrCodeProps = {
  value: string;
  size?: number;
  className?: string;
  onClick?: () => void;
};

/** Scannable QR for student ID verification payload */
export function StudentQrCode({ value, size = 64, className, onClick }: StudentQrCodeProps) {
  return <SafeQrCode value={value} size={size} className={className} onClick={onClick} />;
}
