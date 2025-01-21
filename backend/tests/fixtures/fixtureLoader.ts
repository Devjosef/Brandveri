import fs from 'fs/promises';
import path from 'path';

export const loadFixture = async (fixtureName: string) => {
  const fixturePath = path.join(__dirname, '../fixtures', `${fixtureName}.json`);
  const data = await fs.readFile(fixturePath, 'utf8');
  return JSON.parse(data);
};