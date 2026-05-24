import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as bcrypt from 'bcrypt';

export type UserRole = 'user' | 'manager' | 'admin';

export interface UserMethods {
  comparePassword(candidate: string): Promise<boolean>;
}

export type UserDocument = User & Document & UserMethods;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, trim: true })
  username: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({ trim: true })
  fullName: string;

  @Prop({ trim: true })
  designation: string;

  @Prop({ enum: ['user', 'manager', 'admin'], default: 'user' })
  role: UserRole;

  @Prop()
  avatar: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  lastLogin: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Remove sensitive fields from JSON responses
UserSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret: Record<string, any>) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

// Hash password before saving
UserSchema.pre<UserDocument>('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  this.password = await bcrypt.hash(this.password, 12);
});

// Compare a plaintext password against the stored hash
UserSchema.methods.comparePassword = function (
  candidate: string,
): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};