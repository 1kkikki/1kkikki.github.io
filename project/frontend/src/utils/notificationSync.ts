// 알림 동기화를 위한 이벤트 시스템

export const NOTIFICATION_UPDATED_EVENT = 'notificationUpdated';

export interface NotificationUpdateDetail {
  type: 'read' | 'read-all' | 'new';
  notificationId?: number;
}

// 알림 업데이트 이벤트 발생
export function notifyNotificationUpdated(detail: NotificationUpdateDetail) {
  const event = new CustomEvent(NOTIFICATION_UPDATED_EVENT, { detail });
  window.dispatchEvent(event);
}

// 알림 업데이트 이벤트 리스너 등록
export function onNotificationUpdated(callback: (detail: NotificationUpdateDetail) => void) {
  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<NotificationUpdateDetail>;
    callback(customEvent.detail);
  };
  
  window.addEventListener(NOTIFICATION_UPDATED_EVENT, handler);
  
  return () => {
    window.removeEventListener(NOTIFICATION_UPDATED_EVENT, handler);
  };
}

