export interface Notification {
  id: number;
  user_id: number;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export function getNotifications(limit?: number): Promise<any>;
export function markAsRead(notificationId: number): Promise<any>;
export function markAllAsRead(): Promise<any>;
export function deleteNotification(notificationId: number): Promise<any>;

