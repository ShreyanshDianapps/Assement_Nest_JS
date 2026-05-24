import { SetMetadata, CustomDecorator } from '@nestjs/common';
import { UserRole } from '../../modules/users/schemas/user.schema';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: UserRole[]): CustomDecorator<string> =>
  SetMetadata(ROLES_KEY, roles);
