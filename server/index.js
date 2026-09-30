import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import { authMiddleware } from './auth.js';
import authRoutes from './routes/authRoutes.js';
import employeeRoutes from './routes/employeeRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import siteRoutes from './routes/siteRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import leaveRoutes from './routes/leaveRoutes.js';
import backupRoutes from './routes/backupRoutes.js';
import scheduleRoutes from './routes/scheduleRoutes.js';
import holidayRoutes from './routes/holidayRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5050;

// Middleware with increased payload size for photo/selfie attachments
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global auth token parser
app.use(authMiddleware);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/sites', siteRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/backup', backupRoutes);

// Health check endpoint for cloud monitoring (Render, Railway, Fly.io, Kubernetes)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    app: 'FIREX Attendance - Production Cloud Attendance System',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    timezone: 'Asia/Bahrain',
    uptime_seconds: process.uptime(),
  });
});

// Serve frontend in production
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// Fallback to index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Unhandled Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred.',
  });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[FIREX Attendance Server] 24/7 Cloud Engine running on http://0.0.0.0:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

export default app;
