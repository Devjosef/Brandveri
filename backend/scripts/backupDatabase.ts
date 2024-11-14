import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { exec } from 'child_process';
import { z } from 'zod';
import { Counter, Histogram } from 'prom-client';

// Load and validate environment variables
dotenv.config();

const envSchema = z.object({
  DB_USER: z.string(),
  DB_HOST: z.string(),
  DB_PORT: z.string(),
  DB_NAME: z.string(),
  BACKUP_RETENTION_DAYS: z.string().transform(Number).default('7')
});

// Metrics for backup monitoring
const backupMetrics = {
  attempts: new Counter({
    name: 'database_backup_attempts_total',
    help: 'Total number of database backup attempts',
    labelNames: ['status']
  }),
  duration: new Histogram({
    name: 'database_backup_duration_seconds',
    help: 'Duration of database backup operations'
  })
};

const validateEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    console.error('Invalid environment variables:', error);
    process.exit(1);
  }
};

const cleanOldBackups = (backupDir: string, retentionDays: number) => {
  const now = new Date().getTime();
  fs.readdirSync(backupDir).forEach(file => {
    const filePath = path.join(backupDir, file);
    const stats = fs.statSync(filePath);
    const daysOld = (now - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysOld > retentionDays) {
      fs.unlinkSync(filePath);
      console.log(`Deleted old backup: ${file}`);
    }
  });
};

const backupDatabase = async () => {
  const end = backupMetrics.duration.startTimer();
  const config = validateEnv();
  
  try {
    backupMetrics.attempts.inc({ status: 'attempt' });
    
    const backupDir = path.join(__dirname, '../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const fileName = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.sql`;
    const filePath = path.join(backupDir, fileName);

    const command = `pg_dump -U ${config.DB_USER} -h ${config.DB_HOST} -p ${config.DB_PORT} -F c -b -v -f ${filePath} ${config.DB_NAME}`;

    await new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        if (stderr) {
          console.warn(`Backup warnings: ${stderr}`);
        }
        console.log(`Backup stdout: ${stdout}`);
        resolve(stdout);
      });
    });

    cleanOldBackups(backupDir, config.BACKUP_RETENTION_DAYS);
    backupMetrics.attempts.inc({ status: 'success' });
    console.log(`Backup created successfully: ${filePath}`);
  } catch (error) {
    backupMetrics.attempts.inc({ status: 'error' });
    console.error('Backup failed:', error);
    process.exit(1);
  } finally {
    end();
  }
};

if (require.main === module) {
  backupDatabase();
}

export { backupDatabase };
