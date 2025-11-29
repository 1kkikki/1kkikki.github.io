import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";
import "./AlertDialog.css";

interface AlertDialogProps {
  message: string;
  onClose: () => void;
  show?: boolean;
  autoCloseDelay?: number; // 자동 닫힘 시간 (밀리초)
}

export default function AlertDialog({ message, onClose, show = true, autoCloseDelay = 1500 }: AlertDialogProps) {
  useEffect(() => {
    if (show && autoCloseDelay > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);

      return () => clearTimeout(timer);
    }
  }, [show, autoCloseDelay, onClose]);

  if (!show) return null;

  // 항상 최상위(body)에 포탈로 띄워서 대시보드 레이아웃 여백을 무시하고 전체 화면을 덮도록 처리
  return createPortal(
    <div className="alert-dialog-overlay" onClick={onClose}>
      <div className="alert-dialog-container" onClick={(e) => e.stopPropagation()}>
        <div className="alert-dialog-icon-wrapper">
          <Check className="alert-dialog-icon" size={24} />
        </div>
        <p className="alert-dialog-message">{message}</p>
      </div>
    </div>,
    document.body
  );
}

