import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import projectRoutes from './routes/projects';
import dubRoutes from './routes/dub';
import { errorHandler } from './middleware/error-handler';

dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());

// CORS configuration - remove trailing slash if present
const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
app.use(cors({ 
  origin: frontendUrl,
  credentials: true 
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Routes
app.use('/api/projects', projectRoutes);
app.use('/api/dub', dubRoutes);

// Error handling
app.use(errorHandler);

server.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});

export default app;
