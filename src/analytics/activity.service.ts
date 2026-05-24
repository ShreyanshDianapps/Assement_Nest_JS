import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Request } from 'express';
import {
  TaskActivity,
  TaskActivityAction,
  TaskActivityDocument,
} from './schemas/task-activity.schema';

export interface LogActivityInput {
  taskId: string;
  userId: string;
  action: TaskActivityAction;
  request?: Request;
}

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  constructor(
    @InjectModel(TaskActivity.name)
    private readonly activityModel: Model<TaskActivityDocument>,
  ) {}

  async log(input: LogActivityInput): Promise<void> {
    try {
      await this.activityModel.create({
        taskId: input.taskId,
        userId: input.userId,
        action: input.action,
        ipAddress: this.extractIp(input.request),
        userAgent: input.request?.headers['user-agent'],
      });
    } catch (err) {
      this.logger.warn(
        `Failed to log activity (${input.action} on ${input.taskId}): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  private extractIp(req?: Request): string | undefined {
    if (!req) return undefined;
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0]?.trim();
    }
    return req.ip;
  }
}
