import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

type ValidationTarget = 'body' | 'query' | 'params';

export function validate(target: ValidationTarget, schema: ZodType): RequestHandler {
  return (req, _res, next) => {
    const parsed = schema.parse(req[target]);
    req[target] = parsed;
    next();
  };
}
