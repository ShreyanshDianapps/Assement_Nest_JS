import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TaskActivityAction = 'created' | 'updated' | 'completed' | 'commented';
export type TaskActivityDocument = TaskActivity & Document;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class TaskActivity {
  @Prop({ required: true, index: true })
  taskId: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({
    enum: ['created', 'updated', 'completed', 'commented'],
    required: true,
    index: true,
  })
  action: TaskActivityAction;

  @Prop()
  ipAddress?: string;

  @Prop()
  userAgent?: string;
}

export const TaskActivitySchema = SchemaFactory.createForClass(TaskActivity);
