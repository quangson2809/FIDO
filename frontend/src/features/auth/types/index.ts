export interface AccountDto {
  account_id: number;
  full_name: string | null;
  phone: string;
  email: string | null;
  status: 'ACTIVE' | 'PENDING_APPROVAL' | 'LOCKED' | 'SUSPENDED';
  created_at: string;
  updated_at: string;
}

export interface AddressDto {
  /** Frontend compatibility key mapped from the backend AddressDto.id. */
  address_id: number;
  /** Display label assembled from structured backend address fields when needed. */
  address_text: string;
  created_at: string | null;
  recipient_name: string | null;
  recipient_phone: string | null;
  province: string | null;
  district: string | null;
  ward: string | null;
  address_line: string | null;
  is_default: boolean;
}

export interface RoleDto {
  role_id: number;
  code: string;
  name: string;
  description: string | null;
}

export interface PermissionDto {
  permission_id: number;
  code: string;
  name: string;
}

export interface MeDto {
  account: AccountDto;
  addresses: AddressDto[];
  roles: RoleDto[];
  permissions: PermissionDto[];
}

export interface LoginResponseDto {
  access_token: string;
  token_type: string;
  expires_in: number;
  account: AccountDto;
}

export interface ProfilePatchInput {
  full_name?: string;
  email?: string;
}

export interface AddressInput {
  address_text: string;
}

export interface AuthService {
  login(identifier: string, password: string): Promise<LoginResponseDto>;
  register(
    phone: string,
    fullName: string,
    email: string | null,
    password: string,
  ): Promise<LoginResponseDto>;
  logout(): void;
}

export interface ProfileService {
  getMe(): Promise<MeDto>;
  updateProfile(input: ProfilePatchInput): Promise<AccountDto>;
  addAddress(input: AddressInput): Promise<AddressDto>;
  updateAddress(addressId: number, input: AddressInput): Promise<AddressDto>;
  deleteAddress(addressId: number): Promise<void>;
}
