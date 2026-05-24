import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Task, TaskDocument } from '../tasks/schemas/task.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import {
  TaskActivity,
  TaskActivityDocument,
} from './schemas/task-activity.schema';
import {
  DailyTaskMetric,
  DailyTaskMetricDocument,
} from './schemas/daily-task-metric.schema';

@Injectable()
export class AnalyticsCron {
  private readonly logger = new Logger(AnalyticsCron.name);

  constructor(
    @InjectModel(Task.name) private readonly taskModel: Model<TaskDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(TaskActivity.name)
    private readonly activityModel: Model<TaskActivityDocument>,
    @InjectModel(DailyTaskMetric.name)
    private readonly metricModel: Model<DailyTaskMetricDocument>,
  ) {}

  // Spec: daily at midnight; for testing: every 2 minutes.
  @Cron('*/2 * * * *', { name: 'daily-productivity-aggregation' })
  async aggregateDailyMetrics(): Promise<void> {
    const dayStart = this.startOfUtcDay(new Date());
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    const [tasksCreated, tasksCompleted, activeUserIds] = await Promise.all([
      this.taskModel
        .countDocuments({ createdAt: { $gte: dayStart, $lt: dayEnd } })
        .exec(),
      this.taskModel
        .countDocuments({
          status: 'completed',
          completedAt: { $gte: dayStart, $lt: dayEnd },
        })
        .exec(),
      this.activityModel
        .distinct('userId', { createdAt: { $gte: dayStart, $lt: dayEnd } })
        .exec(),
    ]);

    await this.metricModel.findOneAndUpdate(
      { date: dayStart },
      {
        date: dayStart,
        totalTasksCreated: tasksCreated,
        totalTasksCompleted: tasksCompleted,
        activeUsers: activeUserIds.length,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    this.logger.log(`Aggregated metrics for ${dayStart.toISOString()}`);
  }

  // Spec: every hour; for testing: every 1 minute.
  @Cron(CronExpression.EVERY_MINUTE, { name: 'inactive-user-detection' })
  async markInactiveUsers(): Promise<void> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const recentActiveIds = await this.activityModel.distinct('userId', {
      createdAt: { $gte: thirtyDaysAgo },
    });
    const recentObjectIds = recentActiveIds
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));

    const result = await this.userModel
      .updateMany(
        {
          isActive: true,
          createdAt: { $lt: thirtyDaysAgo },
          _id: { $nin: recentObjectIds },
          $or: [
            { lastLogin: { $lt: thirtyDaysAgo } },
            { lastLogin: { $exists: false } },
          ],
        },
        { $set: { isActive: false } },
      )
      .exec();

    this.logger.log(`Marked ${result.modifiedCount} users inactive`);
  }

  // Bonus: overdue task reminder.
  @Cron(CronExpression.EVERY_10_MINUTES, { name: 'overdue-task-reminder' })
  async remindOverdueTasks(): Promise<void> {
    const now = new Date();
    const overdue = await this.taskModel
      .find(
        {
          dueDate: { $lt: now },
          status: { $ne: 'completed' },
        },
        { title: 1, dueDate: 1, assignedTo: 1 },
      )
      .lean()
      .exec();

    for (const task of overdue) {
      this.logger.warn(
        `Reminder: task "${task.title}" (id=${task._id.toString()}) is overdue` +
          (task.assignedTo
            ? ` for user ${task.assignedTo.toString()}`
            : ' and unassigned'),
      );
    }
  }

  private startOfUtcDay(date: Date): Date {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
  }
}
