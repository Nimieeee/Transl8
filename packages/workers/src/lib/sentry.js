"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSentry = initSentry;
exports.captureException = captureException;
exports.captureMessage = captureMessage;
exports.addBreadcrumb = addBreadcrumb;
exports.startTransaction = startTransaction;
exports.withErrorTracking = withErrorTracking;
const Sentry = __importStar(require("@sentry/node"));
// Note: nodeProfilingIntegration is available in @sentry/profiling-node v8+
// For older versions, profiling integration is included in @sentry/node
/**
 * Initialize Sentry for worker error tracking
 */
function initSentry() {
    if (!process.env.SENTRY_DSN) {
        console.warn('SENTRY_DSN not configured. Sentry error tracking disabled.');
        return;
    }
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        // Performance Monitoring
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        // Profiling
        profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        // Filter out sensitive data
        beforeSend(event, _hint) {
            return event;
        },
    });
    console.log('Sentry initialized for worker error tracking');
}
/**
 * Capture exception with additional context
 */
function captureException(error, context) {
    Sentry.captureException(error, {
        extra: context,
    });
}
/**
 * Capture message with severity level
 */
function captureMessage(message, level = 'info', context) {
    Sentry.captureMessage(message, {
        level,
        extra: context,
    });
}
/**
 * Add breadcrumb for debugging
 */
function addBreadcrumb(message, category, level = 'info', data) {
    Sentry.addBreadcrumb({
        message,
        category,
        level,
        data,
    });
}
/**
 * Start a transaction for performance monitoring
 */
function startTransaction(name, op) {
    Sentry.startSpan({
        name,
        op,
    }, () => { });
}
/**
 * Wrap async function with error tracking
 */
function withErrorTracking(fn, context) {
    return fn().catch((error) => {
        captureException(error, context);
        throw error;
    });
}
exports.default = Sentry;
