import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Comment, CommentDocument } from './schemas/comment.schema';
import { CommentEntity } from './entities/comment.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { TasksService } from '../tasks/tasks.service';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

@Injectable()
export class CommentsService {
  constructor(
    @InjectModel(Comment.name)
    private readonly commentModel: Model<CommentDocument>,
    private readonly tasksService: TasksService,
  ) {}

  async create(
    taskId: string,
    dto: CreateCommentDto,
    userId: string,
  ): Promise<CommentEntity> {
    await this.tasksService.findById(taskId);
    const comment = new this.commentModel({
      taskId: new Types.ObjectId(taskId),
      userId: new Types.ObjectId(userId),
      content: dto.content,
    });
    const saved = await comment.save();
    return CommentEntity.fromDoc(saved);
  }

  async listByTask(taskId: string): Promise<CommentEntity[]> {
    await this.tasksService.findById(taskId);
    const docs = await this.commentModel
      .find({ taskId: new Types.ObjectId(taskId) })
      .sort({ createdAt: -1 })
      .exec();
    return CommentEntity.fromDocs(docs);
  }

  async update(
    id: string,
    dto: UpdateCommentDto,
    user: AuthenticatedUser,
  ): Promise<CommentEntity> {
    const comment = await this.findDocById(id);
    if (comment.userId.toString() !== user.id) {
      throw new ForbiddenException('Only the comment owner can edit it');
    }
    comment.content = dto.content;
    comment.isEdited = true;
    return CommentEntity.fromDoc(await comment.save());
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const comment = await this.findDocById(id);
    const isOwner = comment.userId.toString() === user.id;
    if (!isOwner && user.role !== 'admin') {
      throw new ForbiddenException(
        'Only the comment owner or an admin can delete it',
      );
    }
    await this.commentModel.findByIdAndDelete(id).exec();
  }

  private async findDocById(id: string): Promise<CommentDocument> {
    const comment = await this.commentModel.findById(id).exec();
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    return comment;
  }
}
