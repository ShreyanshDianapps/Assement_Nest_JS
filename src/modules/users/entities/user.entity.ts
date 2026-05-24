import { Expose, Transform } from 'class-transformer';
import type { UserRole } from '../schemas/user.schema';

export class UserEntity {
  @Expose()
  @Transform(({ obj }) => obj._id?.toString() ?? obj.id)
  id: string;

  @Expose() username: string;
  @Expose() email: string;
  @Expose() fullName: string;
  @Expose() designation: string;
  @Expose() role: UserRole;
  @Expose() avatar: string;
  @Expose() isActive: boolean;
  @Expose() lastLogin: Date;
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;
}
