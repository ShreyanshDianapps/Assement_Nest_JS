import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import type { TaskPriority, TaskStatus } from '../schemas/task.schema';

export type TaskSortField = 'dueDate' | 'priority' | 'createdAt';
export type SortOrder = 'asc' | 'desc';

export class QueryTasksDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsEnum(['pending', 'in_progress', 'completed'])
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(['low', 'medium', 'high'])
  priority?: TaskPriority;

  @IsOptional()
  @IsMongoId()
  assignedTo?: string;

  @IsOptional()
  @IsEnum(['dueDate', 'priority', 'createdAt'])
  sortBy?: TaskSortField = 'createdAt';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: SortOrder = 'desc';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}
