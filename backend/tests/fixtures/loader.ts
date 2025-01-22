import { readFile } from 'fs/promises';
import path from 'path';
import { loggers } from '../../observability/contextLoggers';

const logger = loggers.test;

type FixtureType = 'trademark' | 'copyright' | 'payment' | 'recommendation';

export const loadFixture = async <T>(fixtureName: FixtureType): Promise<T> => {
  try {
    const data = await readFile(
      path.join(__dirname, `${fixtureName}.json`), 
      'utf8'
    );
    logger.debug({ fixture: fixtureName }, 'Fixture loaded');
    return JSON.parse(data);
  } catch (error) {
    logger.error({ error, fixture: fixtureName }, 'Failed to load fixture');
    throw error;
  }
};