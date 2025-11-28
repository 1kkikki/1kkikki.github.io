import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { AlertCircle } from "lucide-react";
import "./WarningAlert.css";

interface WarningAlertProps {
  message: string;
  onClose: () => void;
  show?: boolean;
  autoCloseDelay?: number; // 자동 닫힘 시간 (밀리초), 0이면 자동 닫힘 안함
}

export default function WarningAlert({ message, onClose, show = true, autoCloseDelay = 3000 }: WarningAlertProps) {
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
    <div className="warning-alert-overlay" onClick={onClose}>
      <div className="warning-alert-container" onClick={(e) => e.stopPropagation()}>
        <div className="warning-alert-icon-wrapper">
          <AlertCircle className="warning-alert-icon" size={32} />
        </div>
        <p className="warning-alert-message">{message}</p>
        {autoCloseDelay === 0 && (
          <button className="warning-alert-close-button" onClick={onClose}>
            확인
          </button>
        )}
      </div>
    </div>,
    document.body
  );
}

