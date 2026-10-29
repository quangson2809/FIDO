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

const isContractObject = (value: unknown): value is ContractObject =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const expectObject = (value: unknown, endpoint: string, fieldPath: string): ContractObject => {
  if (!isContractObject(value)) {
    return fail(endpoint, fieldPath, 'an object');
  }
  return value;
};

const expectArray = (value: unknown, endpoint: string, fieldPath: string): unknown[] => {
  if (!Array.isArray(value)) {
    return fail(endpoint, fieldPath, 'an array');
  }
  return value;
};

const expectString = (value: unknown, endpoint: string, fieldPath: string): string => {
  if (typeof value !== 'string') {
    return fail(endpoint, fieldPath, 'a string');
  }
  return value;
};

const expectNonBlankString = (value: unknown, endpoint: string, fieldPath: string): string => {
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
): string | null => (value === null ? null : expectString(value, endpoint, fieldPath));

const expectOptionalNullableString = (
  value: unknown,
  endpoint: string,
  fieldPath: string,
): string | null =>
  value === null || value === undefined ? null : expectString(value, endpoint, fieldPath);

const expectInteger = (value: unknown, endpoint: string, fieldPath: string): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    return fail(endpoint, fieldPath, 'a safe integer');
  }
  return value;
};

const responseData = (value: unknown, endpoint: string): unknown =>
  expectObject(value, endpoint, 'response').data;

const expectBoolean = (value: unknown, endpoint: string, fieldPath: string): boolean => {
  if (typeof value !== 'boolean') return fail(endpoint, fieldPath, 'a boolean');
  return value;
};

const parseAccount = (value: unknown, endpoint: string, fieldPath: string): AccountDto => {
  const account = expectObject(value, endpoint, fieldPath);
  // The canonical backend now names the identifier "id"; account_id remains the app's view-model key.
  return {
    account_id: expectInteger(account.id, endpoint, `${fieldPath}.id`),
    full_name:
      account.full_name === null || account.full_name === undefined
        ? null
        : expectString(account.full_name, endpoint, `${fieldPath}.full_name`),
    phone: expectString(account.phone, endpoint, `${fieldPath}.phone`),
    email: expectOptionalNullableString(account.email, endpoint, `${fieldPath}.email`),
    status: expectNonBlankString(account.status, endpoint, `${fieldPath}.status`) as AccountDto['status'],
    created_at: expectString(account.created_at, endpoint, `${fieldPath}.created_at`),
    updated_at: expectString(account.updated_at, endpoint, `${fieldPath}.updated_at`),
  };
};

const parseAddress = (value: unknown, endpoint: string, fieldPath: string): AddressDto => {
  const address = expectObject(value, endpoint, fieldPath);
  const recipientName = expectOptionalNullableString(
    address.recipient_name, endpoint, `${fieldPath}.recipient_name`,
  );
  const recipientPhone = expectOptionalNullableString(
    address.recipient_phone, endpoint, `${fieldPath}.recipient_phone`,
  );
  const province = expectOptionalNullableString(address.province, endpoint, `${fieldPath}.province`);
  const district = expectOptionalNullableString(address.district, endpoint, `${fieldPath}.district`);
  const ward = expectOptionalNullableString(address.ward, endpoint, `${fieldPath}.ward`);
  const addressLine = expectOptionalNullableString(
    address.address_line, endpoint, `${fieldPath}.address_line`,
  );
  const structuredLabel = [addressLine, ward, district, province]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(', ');
  return {
    address_id: expectInteger(address.id, endpoint, `${fieldPath}.id`),
    address_text: structuredLabel,
    created_at: address.created_at === null || address.created_at === undefined
      ? null
      : expectString(address.created_at, endpoint, `${fieldPath}.created_at`),
    recipient_name: recipientName,
    recipient_phone: recipientPhone,
    province,
    district,
    ward,
    address_line: addressLine,
    is_default: expectBoolean(address.is_default, endpoint, `${fieldPath}.is_default`),
  };
};

const parseRole = (value: unknown, endpoint: string, fieldPath: string): RoleDto => {
  const role = expectObject(value, endpoint, fieldPath);
  return {
    role_id: expectInteger(role.role_id, endpoint, `${fieldPath}.role_id`),
    code: expectNonBlankString(role.code, endpoint, `${fieldPath}.code`),
    name: expectString(role.name, endpoint, `${fieldPath}.name`),
    description: expectNullableString(role.description, endpoint, `${fieldPath}.description`),
  };
};

const parsePermission = (value: unknown, endpoint: string, fieldPath: string): PermissionDto => {
  const permission = expectObject(value, endpoint, fieldPath);
  return {
    permission_id: expectInteger(permission.permission_id, endpoint, `${fieldPath}.permission_id`),
    code: expectNonBlankString(permission.code, endpoint, `${fieldPath}.code`),
    name: expectString(permission.name, endpoint, `${fieldPath}.name`),
  };
};

export const parseAccountResponse = (
  value: unknown,
  endpoint = 'PATCH /me',
): AccountDto => parseAccount(responseData(value, endpoint), endpoint, 'data');

export const parseAddressResponse = (
  value: unknown,
  endpoint: string,
): AddressDto => parseAddress(responseData(value, endpoint), endpoint, 'data');

export const parseLoginResponse = (
  value: unknown,
  endpoint = 'POST /auth/login',
): LoginResponseDto => {
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
      parseAddress(address, endpoint, `data.addresses[${index}]`),
    ),
    roles: roles.map((role, index) => parseRole(role, endpoint, `data.roles[${index}]`)),
    permissions: permissions.map((permission, index) =>
      parsePermission(permission, endpoint, `data.permissions[${index}]`),
    ),
  };
};
