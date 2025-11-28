import React, { useEffect } from "react";
import { createPortal } from "react-dom";
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

  // 대시보드 레이아웃과 무관하게 항상 전체 화면을 덮도록 body로 포탈
  return createPortal(
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
    </div>,
    document.body
  );
}

