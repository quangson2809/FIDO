import { MeDto } from '../../../mocks/apiData';

export type { MeDto };

export interface AuthService {
  getProfile(): Promise<MeDto>;
}
