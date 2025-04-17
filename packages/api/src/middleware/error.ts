import { Request, Response, NextFunction } from 'express';
import { logger } from '@blockchain-explorer/common';
const apiLogger = logger.child({ component: 'error-handler' });

export class HttpError extends Error {
  statusCode: number;  
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'HttpError';
  }
}

export const notFound = (req: Request, res: Response, next: NextFunction): void => {
  const error = new HttpError(`Not Found - ${req.originalUrl}`, 404);
  next(error);
};

// global error handler
export const errorHandler = (err: Error | HttpError, req: Request, res: Response, next: NextFunction): void => {
  // Set default status code
  let statusCode = 500;
  
  if ('statusCode' in err && typeof err.statusCode === 'number') {
    statusCode = err.statusCode;
  }

  if (statusCode === 500) {
    apiLogger.error(`Internal server error: ${err.message}`, { 
      stack: err.stack,
      path: req.path,
      method: req.method
    });
  } else {
    apiLogger.warn(`Request error: ${err.message}`, { 
      status: statusCode,
      path: req.path,
      method: req.method
    });
  }
  
  const errorResponse = {
    error: true,
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  };
  
  res.status(statusCode).json(errorResponse);
};

// catch promise rejections
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};