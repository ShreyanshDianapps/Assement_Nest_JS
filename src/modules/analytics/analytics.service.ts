import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Task, TaskDocument } from '../tasks/schemas/task.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import {
  TaskActivity,
  TaskActivityDocument,
} from './schemas/task-activity.schema';

export interface OverviewStats {
  totalTasks: number;
  completedTasks: number;
  activeUsers: number;
}

export interface UserProductivity {
  userId: string;
  totalAssigned: number;
  totalCompleted: number;
  completionRate: number;
  averageCompletionHours: number | null;
}

export interface TrendingTask {
  taskId: string;
  title: string | null;
  activityCount: number;
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Task.name) private readonly taskModel: Model<TaskDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(TaskActivity.name)
    private readonly activityModel: Model<TaskActivityDocument>,
  ) {}

  async getOverview(): Promise<OverviewStats> {
    const [totalTasks, completedTasks, activeUsers] = await Promise.all([
      this.taskModel.countDocuments().exec(),
      this.taskModel.countDocuments({ status: 'completed' }).exec(),
      this.userModel.countDocuments({ isActive: true }).exec(),
    ]);
    return { totalTasks, completedTasks, activeUsers };
  }

  async getUserProductivity(userId: string): Promise<UserProductivity> {
    const assigneeId = new Types.ObjectId(userId);

    const [totalAssigned, totalCompleted, completed] = await Promise.all([
      this.taskModel.countDocuments({ assignedTo: assigneeId }).exec(),
      this.taskModel
        .countDocuments({ assignedTo: assigneeId, status: 'completed' })
        .exec(),
      this.taskModel
        .find(
          {
            assignedTo: assigneeId,
            status: 'completed',
            completedAt: { $ne: null },
          },
          { createdAt: 1, completedAt: 1 },
        )
        .lean()
        .exec(),
    ]);

    let averageCompletionHours: number | null = null;
    if (completed.length > 0) {
      const totalMs = completed.reduce((sum, task) => {
        const created = (task as { createdAt?: Date }).createdAt;
        const finished = (task as { completedAt?: Date }).completedAt;
        if (!created || !finished) return sum;
        return sum + (finished.getTime() - created.getTime());
      }, 0);
      averageCompletionHours = totalMs / completed.length / (1000 * 60 * 60);
    }

    return {
      userId,
      totalAssigned,
      totalCompleted,
      completionRate: totalAssigned === 0 ? 0 : totalCompleted / totalAssigned,
      averageCompletionHours,
    };
  }

  async getTrendingTasks(limit = 10): Promise<TrendingTask[]> {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const aggregated = await this.activityModel
      .aggregate<{ _id: string; count: number }>([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$taskId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: limit },
      ])
      .exec();

    const ids = aggregated
      .map((row) => row._id)
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));

    const tasks = await this.taskModel
      .find({ _id: { $in: ids } }, { title: 1 })
      .lean()
      .exec();
    const titleById = new Map(
      tasks.map((t) => [t._id.toString(), (t as { title?: string }).title ?? null]),
    );

    return aggregated.map((row) => ({
      taskId: row._id,
      title: titleById.get(row._id) ?? null,
      activityCount: row.count,
    }));
  }
}
