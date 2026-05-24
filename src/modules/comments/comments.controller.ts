import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Request } from 'express';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { ActivityService } from '../analytics/activity.service';

@Controller()
@UseGuards(JwtAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
export class CommentsController {
  constructor(
    private readonly commentsService: CommentsService,
    private readonly activityService: ActivityService,
  ) {}

  @Post('tasks/:taskId/comments')
  async create(
    @Param('taskId') taskId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const comment = await this.commentsService.create(taskId, dto, user.id);
    await this.activityService.log({
      taskId,
      userId: user.id,
      action: 'commented',
      request: req,
    });
    return comment;
  }

  @Get('tasks/:taskId/comments')
  list(@Param('taskId') taskId: string) {
    return this.commentsService.listByTask(taskId);
  }

  @Put('comments/:id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCommentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.commentsService.update(id, dto, user);
  }

  @Delete('comments/:id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.commentsService.remove(id, user);
    return { message: 'Comment deleted' };
  }
}
