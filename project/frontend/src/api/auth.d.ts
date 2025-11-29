export interface UserData {
  studentId?: string;
  name: string;
  email: string;
  username: string;
  password: string;
  userType: 'student' | 'professor';
}

export interface LoginCredentials {
  email?: string;
  username?: string;
  password: string;
}

export interface FindIdData {
  name: string;
  email: string;
}

export interface ResetPasswordData {
  username: string;
  email: string;
}

export interface AuthResponse {
  status: number;
  access_token?: string;
  user?: any;
  message?: string;
  username?: string;
  temp_password?: string;
}

export function register(userData: UserData): Promise<AuthResponse>;
export function login(credentials: LoginCredentials): Promise<AuthResponse>;
export function findId(findIdData: FindIdData): Promise<AuthResponse>;
export function resetPassword(resetData: ResetPasswordData): Promise<AuthResponse>;

