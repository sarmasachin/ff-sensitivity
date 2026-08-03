import { NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
export declare class RequestIdMiddleware implements NestMiddleware {
    use(req: Request & {
        requestId?: string;
    }, _res: Response, next: NextFunction): void;
}
