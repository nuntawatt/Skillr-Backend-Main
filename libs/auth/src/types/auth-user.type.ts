import { UserRole } from '@common/enums';

export interface AuthUser {
  userId: string;
  email: string;
  role: UserRole;
}
