import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import multer from 'multer';

export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction): void => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ success: false, message: 'Image is too large. Maximum size is 5MB.' });
      return;
    }
    res.status(400).json({ success: false, message: `File upload error: ${err.message}` });
    return;
  }
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ success: false, message: err.message, errors: (err as any).errors });
    return;
  }
  if (err instanceof ZodError) {
    const errors: Record<string, string[]> = {};
    err.errors.forEach((e) => {
      const path = e.path.join('.');
      if (!errors[path]) errors[path] = [];
      errors[path].push(e.message);
    });
    res.status(422).json({ success: false, message: 'Validation failed', errors });
    return;
  }
  if (err instanceof RangeError) {
    console.error(`[Validation RangeError] ${req.method} ${req.originalUrl}:`, err.message);
    res.status(400).json({ success: false, message: 'Invalid date or numeric parameter provided' });
    return;
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    console.error(`[Prisma Error ${err.code}] ${req.method} ${req.originalUrl}:`, err.message);
    const statusMap: Record<string, number> = {
      P2002: 409,
      P2003: 400,
      P2021: 500,
      P2022: 500,
      P2023: 400,
      P2025: 404,
    };
    const messageMap: Record<string, string> = {
      P2002: 'A record with these details already exists',
      P2003: 'Invalid reference provided',
      P2021: 'Database table missing. Please run database migrations on server.',
      P2022: 'Database column missing. Please run database migrations on server.',
      P2023: 'Invalid data provided',
      P2025: 'Record not found',
    };
    res.status(statusMap[err.code] || 400).json({ success: false, message: messageMap[err.code] || 'Database operation failed' });
    return;
  }
  if (err instanceof Prisma.PrismaClientValidationError) {
    console.error(`[Prisma Validation Error] ${req.method} ${req.originalUrl}:`, err.message);
    res.status(400).json({ success: false, message: 'Invalid database input' });
    return;
  }
  if (err instanceof Prisma.PrismaClientInitializationError) {
    console.error(`[Prisma Database Connection Error] ${req.method} ${req.originalUrl}:`, err.message);
    res.status(503).json({ success: false, message: 'Database service unavailable. Please try again.' });
    return;
  }
  console.error(`[Unhandled Error] ${req.method} ${req.originalUrl}:`, err.name, err.message, err.stack);
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'development' ? err.message || 'Internal server error' : 'Internal server error',
  });
};

export const notFoundHandler = (_req: Request, res: Response): void => {
  res.status(404).json({ success: false, message: 'Route not found' });
};
