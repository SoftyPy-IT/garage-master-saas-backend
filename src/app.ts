import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import notFound from './app/middlewares/notFound';
import router from './app/routes';
import globalErrorHandler from './app/middlewares/globalErrorhandler';
import { backupMongoDB, restoreMongoDB } from './app/utils/backupService';
import { getAllLogsService } from './app/utils/logService';
import fs from 'fs';
import cron from 'node-cron';
import path from 'path';
import config from './app/config';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
const app: Application = express();
app.use(helmet());

// Define ARCHIVE_PATH
const rootDir = process.cwd();
const ARCHIVE_PATH = path.join(rootDir, 'public', 'trust-auto-solutions.gzip');

// Logging middleware in development environment
if (config.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Rate limiting middleware
app.use(
  rateLimit({
    max: 2000,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Too many requests sent by this IP, please try again in an hour!'
  })
);
app.use(express.json());
app.use(cors());

app.set('view engine', 'ejs');
app.use(express.static(path.join('public')));

app.use('/api/v1', router);

app.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    status: 200,
    message: 'Welcome to the API',
  });
});


app.get('/api/v1/logs', async (req: Request, res: Response) => {
  try {
    const result = await getAllLogsService(req);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read log files' });
  }
});

app.post('/api/v1/backup', async (req: Request, res: Response) => {
  try {
    await backupMongoDB();
    res.json({ status: 'success', message: 'Backup completed successfully' });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: 'Backup failed', error: error.message });
  }
});

cron.schedule('0 0 * * *', async () => {
  
  try {
    await backupMongoDB();
  } catch (error: any) {
  }
});

// cron.schedule('0 1 * * *', async () => {
//   const now = new Date();

//   try {
//     const result = await Subscription.updateMany(
//       {
//         endDate: { $lt: now },
//         isActive: true,
//       },
//       {
//         $set: {
//           status: 'Expired',
//           isActive: false,
//         },
//       }
//     );

//    
//   } catch (error) {
//   }
// });

app.post('/api/v1/restore', async (req: Request, res: Response) => {
  try {
    await restoreMongoDB();
    res.json({ status: 'success', message: 'Restore completed successfully' });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: 'Restore failed', error: error.message });
  }
});
app.get('/api/v1/download-backup', (req: Request, res: Response) => {
  res.download(ARCHIVE_PATH, 'trust-auto-solutions.gzip');
});
app.get('/api/v1/backup-logs',  (req: Request, res: Response) => {
  const logPath = path.join(process.cwd(), 'public', 'backup_logs.json');

  if (fs.existsSync(logPath)) {
    const logs = JSON.parse(fs.readFileSync(logPath, 'utf8'));

    // Sort logs by backupEndTime in descending order
    logs.sort(
      (a: any, b: any) => new Date(b.backupEndTime).getTime() - new Date(a.backupEndTime).getTime()
    );

    res.json(logs);
  } else {
    res.status(404).json({ message: 'No logs found' });
  }
});



app.use(globalErrorHandler);
app.use(notFound);

export default app;
