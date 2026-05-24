import { UserRole } from '../../modules/users/schemas/user.schema';

export interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
  role: UserRole;
}
