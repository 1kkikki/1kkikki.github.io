export interface AvailableTimeResponse {
  id: number;
  day_of_week: string;
  start_time: string;
  end_time: string;
}

export interface AddAvailableTimeResponse {
  status: number;
  message?: string;
  [key: string]: any;
}

export function addAvailableTime(
  day_of_week: string,
  start_time: string,
  end_time: string
): Promise<AddAvailableTimeResponse>;

export function getMyAvailableTimes(): Promise<AvailableTimeResponse[]>;

export function deleteAvailableTime(id: string | number): Promise<any>;

