export interface BoardPost {
  id: number;
  course_id: number;
  title: string;
  content: string;
  category: string;
  files?: string[];
  team_board_name?: string | null;
  author_id: number;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: number;
  post_id: number;
  content: string;
  author_id: number;
  parent_comment_id?: number | null;
  created_at: string;
  updated_at: string;
}

export function uploadFile(file: File): Promise<any>;
export function createBoardPost(
  course_id: string,
  title: string,
  content: string,
  category: string,
  files?: any[],
  team_board_name?: string | null,
  poll?: any
): Promise<any>;
export function getBoardPosts(course_id: string): Promise<any>;
export function deleteBoardPost(post_id: number): Promise<any>;
export function updateBoardPost(
  post_id: number,
  title: string,
  content: string,
  files?: any[],
  poll?: any
): Promise<any>;
export function getComments(post_id: number): Promise<any>;
export function createComment(
  post_id: number,
  content: string,
  parent_comment_id?: number | null
): Promise<any>;
export function deleteComment(comment_id: number): Promise<any>;
export function toggleLike(post_id: number): Promise<any>;
export function toggleCommentLike(comment_id: number): Promise<any>;
export function votePoll(post_id: number, option_id: number): Promise<any>;

