export interface Recruitment {
  id: number;
  course_id: number;
  title: string;
  description: string;
  team_board_name: string;
  max_members: number;
  author_id: number;
  created_at: string;
  updated_at: string;
}

export function getRecruitments(course_id: string | number): Promise<any>;
export function createRecruitment(
  course_id: string | number,
  title: string,
  description: string,
  team_board_name: string,
  max_members: number
): Promise<any>;
export function toggleRecruitmentJoin(recruitment_id: number): Promise<any>;
export function deleteRecruitment(recruitment_id: number): Promise<any>;
export function activateTeamBoard(recruitment_id: number): Promise<any>;
export function getTeamBoards(course_id: string | number): Promise<any>;

