import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { AppError, ApiErrorBody } from './app-error';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request & { requestId?: string }>();
    const requestId = req.requestId ?? randomUUID();
    const timestamp = new Date().toISOString();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'Something went wrong.';
    let details: Record<string, unknown> | undefined;

    if (exception instanceof AppError) {
      status = exception.status;
      code = exception.code;
      message = exception.message;
      details = exception.details;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
        code = 'HTTP_ERROR';
      } else if (typeof body === 'object' && body) {
        const obj = body as Record<string, unknown>;
        message = String(obj.message ?? message);
        code = String(obj.error ?? 'HTTP_ERROR');
        if (Array.isArray(obj.message)) {
          details = { fieldErrors: obj.message };
          const first = obj.message
            .map((m) => String(m))
            .filter(Boolean)
            .slice(0, 3)
            .join(' · ');
          message = first || 'Validation failed.';
          code = 'VALIDATION_ERROR';
        }
      }
      if (status === HttpStatus.TOO_MANY_REQUESTS) {
        code = 'RATE_LIMITED';
        message = 'Too many requests. Please wait a moment.';
      }
    }

    const payload: ApiErrorBody = {
      error: { code, message, details, requestId, timestamp },
    };

    // eslint-disable-next-line no-console
    console.error(`[${requestId}]`, exception);
    res.status(status).json(payload);
  }
}
