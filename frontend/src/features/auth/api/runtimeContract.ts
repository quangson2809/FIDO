import type {
  AccountDto,
  AddressDto,
  LoginResponseDto,
  MeDto,
  PermissionDto,
  RoleDto,
} from '../types';

type ContractObject = Record<string, unknown>;

export class AuthApiContractError extends Error {
  readonly endpoint: string;
  readonly fieldPath: string;

  constructor(endpoint: string, fieldPath: string, expected: string) {
    super(`Invalid API response from ${endpoint}: ${fieldPath} must be ${expected}.`);
    this.name = 'AuthApiContractError';
    this.endpoint = endpoint;
    this.fieldPath = fieldPath;
  }
}

const fail = (endpoint: string, fieldPath: string, expected: string): never => {
  throw new AuthApiContractError(endpoint, fieldPath, expected);
};

const expectObject = (
  value: unknown,
  endpoint: string,
  fieldPath: string,
): ContractObject => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return fail(endpoint, fieldPath, 'an object');
  }
  return value;
};

const expectArray = (
  value: unknown,
  endpoint: string,
  fieldPath: string,
): unknown[] => {
  if (!Array.isArray(value)) {
    return fail(endpoint, fieldPath, 'an array');
  }
  return value;
};

const expectString = (
  value: unknown,
  endpoint: string,
  fieldPath: string,
): string => {
  if (typeof value !== 'string') {
    return fail(endpoint, fieldPath, 'a string');
  }
  return value;
};

const expectNonBlankString = (
  value: unknown,
  endpoint: string,
  fieldPath: string,
): string => {
  const result = expectString(value, endpoint, fieldPath);
  if (!result.trim()) {
    return fail(endpoint, fieldPath, 'a non-blank string');
  }
  return result;
};

const expectNullableString = (
  value: unknown,
  endpoint: string,
  fieldPath: string,
): string | null => (
  value === null ? null : expectString(value, endpoint, fieldPath)
);

const expectInteger = (
  value: unknown,
  endpoint: string,
  fieldPath: string,
): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    return fail(endpoint, fieldPath, 'a safe integer');
  }
  return value;
};

const responseData = (value: unknown, endpoint: string): unknown =>
  expectObject(value, endpoint, 'response').data;

const parseAccount = (
  value: unknown,
  endpoint: string,
  fieldPath: string,
): AccountDto => {
  const account = expectObject(value, endpoint, fieldPath);
  return {
    account_id: expectInteger(account.account_id, endpoint, `${fieldPath}.account_id`),
    phone: expectString(account.phone, endpoint, `${fieldPath}.phone`),
    email: expectNullableString(account.email, endpoint, `${fieldPath}.email`),
    created_at: expectString(account.created_at, endpoint, `${fieldPath}.created_at`),
    updated_at: expectString(account.updated_at, endpoint, `${fieldPath}.updated_at`),
  };
};

const parseAddress = (
  value: unknown,
  endpoint: string,
  fieldPath: string,
): AddressDto => {
  const address = expectObject(value, endpoint, fieldPath);
  return {
    address_id: expectInteger(address.address_id, endpoint, `${fieldPath}.address_id`),
    address_text: expectString(address.address_text, endpoint, `${fieldPath}.address_text`),
    created_at: expectString(address.created_at, endpoint, `${fieldPath}.created_at`),
  };
};

const parseRole = (
  value: unknown,
  endpoint: string,
  fieldPath: string,
): RoleDto => {
  const role = expectObject(value, endpoint, fieldPath);
  return {
    role_id: expectInteger(role.role_id, endpoint, `${fieldPath}.role_id`),
    code: expectNonBlankString(role.code, endpoint, `${fieldPath}.code`),
    name: expectString(role.name, endpoint, `${fieldPath}.name`),
    description: expectNullableString(role.description, endpoint, `${fieldPath}.description`),
  };
};

const parsePermission = (
  value: unknown,
  endpoint: string,
  fieldPath: string,
): PermissionDto => {
  const permission = expectObject(value, endpoint, fieldPath);
  return {
    permission_id: expectInteger(permission.permission_id, endpoint, `${fieldPath}.permission_id`),
    code: expectNonBlankString(permission.code, endpoint, `${fieldPath}.code`),
    name: expectString(permission.name, endpoint, `${fieldPath}.name`),
  };
};

export const parseLoginResponse = (value: unknown): LoginResponseDto => {
  const endpoint = 'POST /auth/login';
  const data = expectObject(responseData(value, endpoint), endpoint, 'data');

  return {
    access_token: expectNonBlankString(data.access_token, endpoint, 'data.access_token'),
    token_type: expectNonBlankString(data.token_type, endpoint, 'data.token_type'),
    expires_in: expectInteger(data.expires_in, endpoint, 'data.expires_in'),
    account: parseAccount(data.account, endpoint, 'data.account'),
  };
};

export const parseMeResponse = (value: unknown): MeDto => {
  const endpoint = 'GET /me';
  const data = expectObject(responseData(value, endpoint), endpoint, 'data');
  const addresses = expectArray(data.addresses, endpoint, 'data.addresses');
  const roles = expectArray(data.roles, endpoint, 'data.roles');
  const permissions = expectArray(data.permissions, endpoint, 'data.permissions');

  return {
    account: parseAccount(data.account, endpoint, 'data.account'),
    addresses: addresses.map((address, index) =>
      parseAddress(address, endpoint, `data.addresses[${index}]`)),
    roles: roles.map((role, index) =>
      parseRole(role, endpoint, `data.roles[${index}]`)),
    permissions: permissions.map((permission, index) =>
      parsePermission(permission, endpoint, `data.permissions[${index}]`)),
  };
};
