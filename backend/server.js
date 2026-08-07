const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

const authRoutes = require('./routes/authRoutes');
const incidentRoutes = require('./routes/incidentRoutes');
const rescuerRoutes = require('./routes/rescuerRoutes');
const messageRoutes = require('./routes/messages');
const transcriptRoutes = require('./routes/transcriptRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const roadblockRoutes = require('./routes/roadblockRoutes');
const healthRoutes = require('./routes/healthRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const systemRoutes = require('./routes/systemRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const navigationRoutes = require('./routes/navigationRoutes');
const speechRoutes = require('./routes/speechRoutes');
const evidenceRoutes = require('./routes/evidence');
const { healthcheck } = require('./controllers/systemController');
const { initSocket } = require('./sockets');
const { setIO } = require('./services/socketService');
const { metricsMiddleware } = require('./middleware/metricsMiddleware');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4000);
const host = process.env.HOST || '0.0.0.0';

const storagePath = process.env.STORAGE_PATH
  ? path.resolve(process.cwd(), process.env.STORAGE_PATH)
  : path.resolve(__dirname, 'uploads');

fs.mkdirSync(storagePath, { recursive: true });

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));
app.use(metricsMiddleware);
app.use('/uploads', express.static(storagePath));

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/rescuers', rescuerRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/transcripts', transcriptRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/roadblocks', roadblockRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/navigation', navigationRoutes);
app.use('/api/speech', speechRoutes);
app.use('/api/evidence', evidenceRoutes);

app.get('/healthcheck', healthcheck);

app.use(notFoundHandler);
app.use(errorHandler);

async function connectDatabase(mongoUri = process.env.MONGO_URI) {
  if (!mongoUri) {
    throw new Error('MONGO_URI is not configured.');
  }
  await mongoose.connect(mongoUri);
}

async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

async function startServer() {
  await connectDatabase();

  const server = http.createServer(app);
  const io = initSocket(server);
  setIO(io);

  server.listen(port, host, () => {
    console.log(`ERS backend listening on http://${host}:${port}`);
  });

  return server;
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

module.exports = {
  app,
  startServer,
  connectDatabase,
  disconnectDatabase
};
