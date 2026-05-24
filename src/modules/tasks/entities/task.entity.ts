import { Expose, Transform, plainToInstance } from 'class-transformer';
import type { TaskDocument, TaskPriority, TaskStatus } from '../schemas/task.schema';

const toIdString = ({ obj, key }: { obj: Record<string, unknown>; key: string }): string | undefined => {
  const value = obj[key];
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (typeof (value as { toString?: () => string }).toString === 'function') {
    return (value as { toString: () => string }).toString();
  }
  return undefined;
};

export class TaskEntity {
  @Expose()
  @Transform(({ obj }) => toIdString({ obj, key: '_id' }) ?? obj.id)
  id: string;

  @Expose() title: string;
  @Expose() description: string;

  @Expose()
  @Transform(({ obj }) => toIdString({ obj, key: 'assignedTo' }))
  assignedTo?: string;

  @Expose()
  @Transform(({ obj }) => toIdString({ obj, key: 'createdBy' }))
  createdBy: string;

  @Expose() priority: TaskPriority;
  @Expose() status: TaskStatus;
  @Expose() dueDate?: Date;
  @Expose() tags: string[];
  @Expose() completedAt?: Date;
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;

  static fromDoc(doc: TaskDocument): TaskEntity {
    const plain = typeof doc.toObject === 'function' ? doc.toObject() : doc;
    return plainToInstance(TaskEntity, plain, { excludeExtraneousValues: true });
  }

  static fromDocs(docs: TaskDocument[]): TaskEntity[] {
    return docs.map((d) => TaskEntity.fromDoc(d));
  }
}
