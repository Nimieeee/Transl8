"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.logWithContext = logWithContext;
exports.logError = logError;
exports.logJobProcessing = logJobProcessing;
exports.logModelInference = logModelInference;
exports.createChildLogger = createChildLogger;
const winston_1 = __importDefault(require("winston"));
/**
 * Custom format for development (human-readable)
 */
const developmentFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.colorize(), winston_1.default.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} ${level}: ${message} ${metaStr}`;
}));
/**
 * Custom format for production (JSON)
 */
const productionFormat = winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json());
/**
 * Create Winston logger instance
 */
function createLogger() {
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const logLevel = process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info');
    const transports = [
        new winston_1.default.transports.Console({
            format: isDevelopment ? developmentFormat : productionFormat,
        }),
    ];
    // Add file transports in production
    if (!isDevelopment) {
        transports.push(new winston_1.default.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            format: productionFormat,
            maxsize: 10485760, // 10MB
            maxFiles: 5,
        }), new winston_1.default.transports.File({
            filename: 'logs/combined.log',
            format: productionFormat,
            maxsize: 10485760, // 10MB
            maxFiles: 5,
        }));
    }
    return winston_1.default.createLogger({
        level: logLevel,
        transports,
        exitOnError: false,
    });
}
exports.logger = createLogger();
/**
 * Log with context
 */
function logWithContext(level, message, context) {
    exports.logger.log(level, message, context);
}
/**
 * Log error with stack trace
 */
function logError(error, context) {
    exports.logger.error(error.message, {
        error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
        },
        ...context,
    });
}
/**
 * Log job processing
 */
function logJobProcessing(stage, jobId, status, context) {
    const level = status === 'failed' ? 'error' : 'info';
    const message = `Job ${status}`;
    exports.logger.log(level, message, {
        stage,
        jobId,
        status,
        ...context,
    });
}
/**
 * Log model inference
 */
function logModelInference(model, duration, success, context) {
    const level = success ? 'info' : 'error';
    const message = success ? 'Model inference completed' : 'Model inference failed';
    exports.logger.log(level, message, {
        model,
        duration,
        success,
        ...context,
    });
}
/**
 * Create child logger with default context
 */
function createChildLogger(defaultContext) {
    return {
        error: (message, context) => exports.logger.error(message, { ...defaultContext, ...context }),
        warn: (message, context) => exports.logger.warn(message, { ...defaultContext, ...context }),
        info: (message, context) => exports.logger.info(message, { ...defaultContext, ...context }),
        debug: (message, context) => exports.logger.debug(message, { ...defaultContext, ...context }),
    };
}
exports.default = exports.logger;
