import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Request } from 'express';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { QueryTasksDto } from './dto/query-tasks.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { ActivityService } from '../analytics/activity.service';

@Controller('tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(ClassSerializerInterceptor)
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly activityService: ActivityService,
  ) {}

  @Post()
  @Roles('manager', 'admin')
  async create(
    @Body() dto: CreateTaskDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const task = await this.tasksService.create(dto, user.id);
    await this.activityService.log({
      taskId: task.id,
      userId: user.id,
      action: 'created',
      request: req,
    });
    return task;
  }

  @Get()
  findAll(@Query() query: QueryTasksDto) {
    return this.tasksService.findAll(query);
  }

  @Get('search')
  search(@Query() query: QueryTasksDto) {
    return this.tasksService.findAll(query);
  }

  @Get('my-tasks')
  findMyTasks(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryTasksDto,
  ) {
    return this.tasksService.findMyTasks(user.id, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tasksService.findById(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const task = await this.tasksService.update(id, dto, user);
    await this.activityService.log({
      taskId: task.id,
      userId: user.id,
      action: 'updated',
      request: req,
    });
    return task;
  }

  @Delete(':id')
  @Roles('admin')
  async remove(@Param('id') id: string) {
    await this.tasksService.remove(id);
    return { message: 'Task deleted' };
  }

  @Patch(':id/complete')
  async complete(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const task = await this.tasksService.complete(id, user);
    await this.activityService.log({
      taskId: task.id,
      userId: user.id,
      action: 'completed',
      request: req,
    });
    return task;
  }
}
