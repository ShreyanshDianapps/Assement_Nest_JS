import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

const BEARER_PREFIX = 'Bearer ';

export const Token = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith(BEARER_PREFIX)) {
      return undefined;
    }

    const token = authHeader.slice(BEARER_PREFIX.length).trim();
    return token.length > 0 ? token : undefined;
  },
);
