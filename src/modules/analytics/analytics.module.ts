import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  TaskActivity,
  TaskActivitySchema,
} from './schemas/task-activity.schema';
import {
  DailyTaskMetric,
  DailyTaskMetricSchema,
} from './schemas/daily-task-metric.schema';
import { Task, TaskSchema } from '../tasks/schemas/task.schema';
import { UsersModule } from '../users/user.module';
import { ActivityService } from './activity.service';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsCron } from './analytics.cron';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TaskActivity.name, schema: TaskActivitySchema },
      { name: DailyTaskMetric.name, schema: DailyTaskMetricSchema },
      { name: Task.name, schema: TaskSchema },
    ]),
    UsersModule,
  ],
  controllers: [AnalyticsController],
  providers: [ActivityService, AnalyticsService, AnalyticsCron],
  exports: [ActivityService, MongooseModule],
})
export class AnalyticsModule {}
