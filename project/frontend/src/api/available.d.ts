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

export interface TeamAvailabilityResponse {
  team_id: number;
  team_board_name?: string | null;
  course_id?: string;
  team_size: number;
  members: Array<{
    user_id: number;
    name: string;
    student_id?: string | null;
    user_type?: string;
    times: Array<{
      day_of_week: string;
      start_time: string;
      end_time: string;
    }>;
  }>;
  optimal_slots: string[];
  slot_counts: Record<string, number>;
  daily_blocks: Record<string, Array<{ start_time: string; end_time: string }>>;
}

export function addAvailableTime(
  day_of_week: string,
  start_time: string,
  end_time: string
): Promise<AddAvailableTimeResponse>;

export function getMyAvailableTimes(): Promise<AvailableTimeResponse[]>;

export function deleteAvailableTime(id: string | number): Promise<any>;

export function getTeamCommonAvailability(teamId: number): Promise<TeamAvailabilityResponse | { error: any }>;

export interface AutoRecommendResponse {
  status: number;
  msg?: string;
  message?: string;
  post_id?: number;
  recommended_slots?: Array<{
    day_of_week: string;
    start_time: string;
    end_time: string;
    duration_minutes: number;
  }>;
  post?: any;
}

export function autoRecommendAndPost(teamId: number): Promise<AutoRecommendResponse>;

