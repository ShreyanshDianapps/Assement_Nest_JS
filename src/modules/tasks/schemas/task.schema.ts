import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'pending' | 'in_progress' | 'completed';
export type TaskDocument = Task & Document;

@Schema({ timestamps: true })
export class Task {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ trim: true, default: '' })
  description: string;

  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  assignedTo?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  createdBy: Types.ObjectId;

  @Prop({ enum: ['low', 'medium', 'high'], default: 'medium', index: true })
  priority: TaskPriority;

  @Prop({
    enum: ['pending', 'in_progress', 'completed'],
    default: 'pending',
    index: true,
  })
  status: TaskStatus;

  @Prop({ index: true })
  dueDate?: Date;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop()
  completedAt?: Date;
}

export const TaskSchema = SchemaFactory.createForClass(Task);

TaskSchema.index({ title: 'text', description: 'text' });
