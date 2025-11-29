import { useEffect } from "react";
import { Check } from "lucide-react";
import "./SuccessAlert.css";

interface SuccessAlertProps {
  message: string;
  onClose: () => void;
  show?: boolean;
  autoCloseDelay?: number; // 자동 닫힘 시간 (밀리초)
}

export default function SuccessAlert({ message, onClose, show = true, autoCloseDelay = 1500 }: SuccessAlertProps) {
  useEffect(() => {
    if (show && autoCloseDelay > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);

      return () => clearTimeout(timer);
    }
  }, [show, autoCloseDelay, onClose]);

  if (!show) return null;

  return (
    <div className="success-alert-overlay" onClick={onClose}>
      <div className="success-alert-container" onClick={(e) => e.stopPropagation()}>
        <div className="success-alert-icon-wrapper">
          <Check className="success-alert-icon" size={32} />
        </div>
        <p className="success-alert-message">{message}</p>
      </div>
    </div>
  );
}

