export interface AccountDto {
  account_id: number;
  phone: string;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface AddressDto {
  address_id: number;
  address_text: string;
  created_at: string;
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
  phone?: string;
  email?: string;
}

export interface AddressInput {
  address_text: string;
}

export interface AuthService {
  login(identifier: string, password: string): Promise<LoginResponseDto>;
  register(phone: string, email: string | null, password: string): Promise<AccountDto>;
  logout(): void;
}

export interface ProfileService {
  getMe(): Promise<MeDto>;
  updateProfile(input: ProfilePatchInput): Promise<AccountDto>;
  addAddress(input: AddressInput): Promise<AddressDto>;
  updateAddress(addressId: number, input: AddressInput): Promise<AddressDto>;
  deleteAddress(addressId: number): Promise<void>;
}
