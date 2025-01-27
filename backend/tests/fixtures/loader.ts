import { readFileSync } from 'fs';
import path from 'path';
import { loggers } from '../../observability/contextLoggers';

const logger = loggers.test;

// Load all fixtures at startup.
export const fixtures = {
  trademark: loadFixture('trademark'),
  copyright: loadFixture('copyright'),
  payment: loadFixture('payment'),
  recommendation: loadFixture('recommendation')
} as const;

function loadFixture(name: string) {
  try {
    return JSON.parse(
      readFileSync(path.join(__dirname, `${name}.json`), 'utf8')
    );
  } catch (error) {
    logger.error({ error, fixture: name }, 'Failed to load fixture');
    process.exit(1);  // Fail fast if fixtures are missing.
  }
}