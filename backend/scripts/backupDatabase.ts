import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { exec } from 'child_process';

// Load environment variables
dotenv.config();

const backupDatabase = () => {
    const backupDir = path.join(__dirname, 'backups');
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir);
    }

    const fileName = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.sql`;
    const filePath = path.join(backupDir, fileName);

    const command = `pg_dump -U ${process.env.DB_USER} -h ${process.env.DB_HOST} -p ${process.env.DB_PORT} -F c -b -v -f ${filePath} ${process.env.DB_NAME}`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error creating backup: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`Backup stderr: ${stderr}`);
            return;
        }
        // Log or process the standard output
        console.log(`Backup stdout: ${stdout}`);
        console.log(`Backup created successfully: ${filePath}`);
    });
};

backupDatabase();
