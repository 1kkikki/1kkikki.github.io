import React, { useEffect } from "react";
import { Check } from "lucide-react";
import "./ConfirmDialog.css";

interface ConfirmDialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  show?: boolean;
  confirmText?: string;
  cancelText?: string;
}

export default function ConfirmDialog({ 
  message, 
  onConfirm, 
  onCancel, 
  show = true,
  confirmText = "확인",
  cancelText = "취소"
}: ConfirmDialogProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && show) {
        onCancel();
      }
    };

    if (show) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [show, onCancel]);

  if (!show) return null;

  return (
    <div className="confirm-dialog-overlay" onClick={onCancel}>
      <div className="confirm-dialog-container" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-dialog-icon-wrapper">
          <Check className="confirm-dialog-icon" size={24} />
        </div>
        <p className="confirm-dialog-message">{message}</p>
        <div className="confirm-dialog-footer">
          <button className="confirm-dialog-button confirm-dialog-button--cancel" onClick={onCancel}>
            {cancelText}
          </button>
          <button className="confirm-dialog-button confirm-dialog-button--confirm" onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

