import winston from 'winston';
import { getConfig } from '../config';

const { combine, timestamp, printf, colorize } = winston.format;

const logFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let formattedMessage = `${timestamp} [${level}]: ${message}`;
  
  if (Object.keys(metadata).length > 0 && metadata.service) {
    formattedMessage += ` ${JSON.stringify(metadata)}`;
  }
  
  return formattedMessage;
});

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(
    timestamp(),
    logFormat
  ),
  defaultMeta: { service: 'blockchain-explorer' },
  transports: [
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp(),
        logFormat
      )
    }),
    
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ],
});

export const createServiceLogger = (serviceName: string) => {
  return logger.child({ service: serviceName });
};