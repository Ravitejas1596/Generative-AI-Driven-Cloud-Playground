const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const winston = require('winston');

// Import routes
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const deploymentRoutes = require('./routes/deployments');
const aiRoutes = require('./routes/ai');
const infrastructureRoutes = require('./routes/infrastructure');
const auditRoutes = require('./routes/audit');

// Import services
const { initializeAI } = require('./services/aiService');
const { initializeCloudProviders } = require('./services/cloudService');
const { initializeWebhooks } = require('./services/webhookService');

// Load environment variables
require('dotenv').config();

// Initialize logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Middleware
app.use(helmet());
app.use(limiter);
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/deployments', deploymentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/infrastructure', infrastructureRoutes);
app.use('/api/audit', auditRoutes);

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on('join-project', (projectId) => {
    socket.join(`project-${projectId}`);
    logger.info(`Client ${socket.id} joined project ${projectId}`);
  });

  socket.on('deployment-update', (data) => {
    socket.to(`project-${data.projectId}`).emit('deployment-progress', data);
  });

  socket.on('ai-chat', async (data) => {
    try {
      const aiResponse = await require('./services/aiService').processChatMessage(data.message, data.context);
      socket.emit('ai-response', {
        message: aiResponse,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('AI chat error:', error);
      socket.emit('ai-error', { error: 'Failed to process AI request' });
    }
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'The requested resource was not found'
  });
});

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cloud-playground', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  logger.info('Connected to MongoDB');
})
.catch((error) => {
  logger.error('MongoDB connection error:', error);
  process.exit(1);
});

// Initialize services
const initializeServices = async () => {
  try {
    await initializeAI();
    await initializeCloudProviders();
    await initializeWebhooks();
    logger.info('All services initialized successfully');
  } catch (error) {
    logger.error('Service initialization error:', error);
    process.exit(1);
  }
};

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
  logger.info(`Server running on port ${PORT}`);
  await initializeServices();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    mongoose.connection.close(false, () => {
      logger.info('MongoDB connection closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    mongoose.connection.close(false, () => {
      logger.info('MongoDB connection closed');
      process.exit(0);
    });
  });
});

module.exports = { app, server, io };
