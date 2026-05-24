import { Expose, Transform, plainToInstance } from 'class-transformer';
import type { CommentDocument } from '../schemas/comment.schema';

const toIdString = ({ obj, key }: { obj: Record<string, unknown>; key: string }): string | undefined => {
  const value = obj[key];
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (typeof (value as { toString?: () => string }).toString === 'function') {
    return (value as { toString: () => string }).toString();
  }
  return undefined;
};

export class CommentEntity {
  @Expose()
  @Transform(({ obj }) => toIdString({ obj, key: '_id' }) ?? obj.id)
  id: string;

  @Expose()
  @Transform(({ obj }) => toIdString({ obj, key: 'taskId' }))
  taskId: string;

  @Expose()
  @Transform(({ obj }) => toIdString({ obj, key: 'userId' }))
  userId: string;

  @Expose() content: string;
  @Expose() isEdited: boolean;
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;

  static fromDoc(doc: CommentDocument): CommentEntity {
    const plain = typeof doc.toObject === 'function' ? doc.toObject() : doc;
    return plainToInstance(CommentEntity, plain, { excludeExtraneousValues: true });
  }

  static fromDocs(docs: CommentDocument[]): CommentEntity[] {
    return docs.map((d) => CommentEntity.fromDoc(d));
  }
}
