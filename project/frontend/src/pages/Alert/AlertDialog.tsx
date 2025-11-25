import React, { useEffect } from "react";
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

  return (
    <div className="alert-dialog-overlay" onClick={onClose}>
      <div className="alert-dialog-container" onClick={(e) => e.stopPropagation()}>
        <div className="alert-dialog-icon-wrapper">
          <Check className="alert-dialog-icon" size={24} />
        </div>
        <p className="alert-dialog-message">{message}</p>
      </div>
    </div>
  );
}

