import { UserRole } from '@common/enums';

export interface AuthUser {
  id?: number | string;
  sub?: number | string;
  email?: string;
  role?: UserRole | string;
}
