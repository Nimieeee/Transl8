import { CorsOptions } from 'cors';

/**
 * CORS configuration for the API
 * Restricts access to specific origins based on environment
 */
export const corsOptions: CorsOptions = {
  // Allow requests from frontend origin
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  
  // Allow credentials (cookies, authorization headers)
  credentials: true,
  
  // Allowed HTTP methods
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  
  // Allowed headers
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
  ],
  
  // Exposed headers (accessible to the client)
  exposedHeaders: [
    'Content-Length',
    'Content-Type',
    'X-Request-Id',
    'RateLimit-Limit',
    'RateLimit-Remaining',
    'RateLimit-Reset',
  ],
  
  // Preflight cache duration (in seconds)
  maxAge: 86400, // 24 hours
  
  // Success status for preflight requests
  optionsSuccessStatus: 204,
};

/**
 * Get allowed origins based on environment
 */
function getAllowedOrigins(): string[] {
  const env = process.env.NODE_ENV || 'development';
  
  // Production: Only allow specific domains
  if (env === 'production') {
    const origins = process.env.ALLOWED_ORIGINS?.split(',') || [];
    return origins.map(origin => origin.trim());
  }
  
  // Staging: Allow staging domains
  if (env === 'staging') {
    return [
      process.env.FRONTEND_URL || 'https://staging.example.com',
      'https://staging-admin.example.com',
    ];
  }
  
  // Development: Allow localhost and local network
  return [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    // Allow local network access for mobile testing
    ...(process.env.LOCAL_NETWORK_IP 
      ? [`http://${process.env.LOCAL_NETWORK_IP}:3000`] 
      : []
    ),
  ];
}

/**
 * CORS error handler
 */
export function handleCorsError(err: Error, _req: any, res: any, next: any) {
  if (err.message === 'Not allowed by CORS') {
    res.status(403).json({
      error: {
        code: 'CORS_ERROR',
        message: 'Origin not allowed by CORS policy',
        retryable: false,
      },
    });
  } else {
    next(err);
  }
}
