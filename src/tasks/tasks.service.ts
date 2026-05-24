import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, SortOrder, Types } from 'mongoose';
import { Task, TaskDocument } from './schemas/task.schema';
import { TaskEntity } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { QueryTasksDto } from './dto/query-tasks.dto';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

type TaskFilter = Record<string, unknown>;

export interface PaginatedTasks {
  items: TaskEntity[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

@Injectable()
export class TasksService {
  constructor(
    @InjectModel(Task.name) private readonly taskModel: Model<TaskDocument>,
  ) {}

  async create(dto: CreateTaskDto, creatorId: string): Promise<TaskEntity> {
    const task = new this.taskModel({
      ...dto,
      createdBy: new Types.ObjectId(creatorId),
      assignedTo: dto.assignedTo ? new Types.ObjectId(dto.assignedTo) : undefined,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
    });
    const saved = await task.save();
    return TaskEntity.fromDoc(saved);
  }

  async findAll(query: QueryTasksDto): Promise<PaginatedTasks> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder: SortOrder = query.sortOrder === 'asc' ? 1 : -1;

    const filter: TaskFilter = {};
    if (query.status) filter.status = query.status;
    if (query.priority) filter.priority = query.priority;
    if (query.assignedTo) filter.assignedTo = new Types.ObjectId(query.assignedTo);
    if (query.q) {
      const regex = new RegExp(this.escapeRegex(query.q), 'i');
      filter.$or = [{ title: regex }, { description: regex }];
    }

    const [docs, total] = await Promise.all([
      this.taskModel
        .find(filter)
        .sort({ [sortBy]: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.taskModel.countDocuments(filter).exec(),
    ]);

    return {
      items: TaskEntity.fromDocs(docs),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async findMyTasks(
    userId: string,
    query: QueryTasksDto,
  ): Promise<PaginatedTasks> {
    return this.findAll({ ...query, assignedTo: userId });
  }

  async findById(id: string): Promise<TaskEntity> {
    return TaskEntity.fromDoc(await this.findDocById(id));
  }

  async update(
    id: string,
    dto: UpdateTaskDto,
    user: AuthenticatedUser,
  ): Promise<TaskEntity> {
    const task = await this.findDocById(id);
    this.assertCanModify(task, user);

    const patch: Record<string, unknown> = {};
    if (dto.title !== undefined) patch.title = dto.title;
    if (dto.description !== undefined) patch.description = dto.description;
    if (dto.priority !== undefined) patch.priority = dto.priority;
    if (dto.status !== undefined) patch.status = dto.status;
    if (dto.tags !== undefined) patch.tags = dto.tags;
    if (dto.assignedTo !== undefined) {
      patch.assignedTo = new Types.ObjectId(dto.assignedTo);
    }
    if (dto.dueDate !== undefined) patch.dueDate = new Date(dto.dueDate);

    const updated = await this.taskModel
      .findByIdAndUpdate(id, patch, { new: true, runValidators: true })
      .exec();
    if (!updated) {
      throw new NotFoundException('Task not found');
    }
    return TaskEntity.fromDoc(updated);
  }

  async remove(id: string): Promise<void> {
    const result = await this.taskModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('Task not found');
    }
  }

  async complete(id: string, user: AuthenticatedUser): Promise<TaskEntity> {
    const task = await this.findDocById(id);

    const isAssignee = task.assignedTo?.toString() === user.id;
    const isCreator = task.createdBy.toString() === user.id;
    if (!isAssignee && !isCreator && user.role !== 'admin') {
      throw new ForbiddenException(
        'Only the assignee, creator, or an admin can complete this task',
      );
    }

    task.status = 'completed';
    task.completedAt = new Date();
    return TaskEntity.fromDoc(await task.save());
  }

  private async findDocById(id: string): Promise<TaskDocument> {
    const task = await this.taskModel.findById(id).exec();
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    return task;
  }

  private assertCanModify(task: TaskDocument, user: AuthenticatedUser): void {
    const isCreator = task.createdBy.toString() === user.id;
    if (!isCreator && user.role !== 'admin') {
      throw new ForbiddenException(
        'Only the creator or an admin can update this task',
      );
    }
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
