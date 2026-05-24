import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DailyTaskMetricDocument = DailyTaskMetric & Document;

@Schema({ timestamps: true })
export class DailyTaskMetric {
  @Prop({ required: true, unique: true, index: true })
  date: Date;

  @Prop({ default: 0 })
  totalTasksCreated: number;

  @Prop({ default: 0 })
  totalTasksCompleted: number;

  @Prop({ default: 0 })
  activeUsers: number;
}

export const DailyTaskMetricSchema =
  SchemaFactory.createForClass(DailyTaskMetric);
