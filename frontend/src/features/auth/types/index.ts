export interface UserProfileDto {
  account_id: number;
  email: string;
  full_name: string;
}
export interface AuthService {
  getProfile(): Promise<UserProfileDto>;
}
