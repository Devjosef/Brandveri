import { readFileSync } from 'fs';
import path from 'path';
import { loggers } from '../../observability/contextLoggers';

const logger = loggers.test;

// Simple type definitions.
type Fixture = {
  valid: Record<string, unknown>;
  invalid: Record<string, unknown>;
  edge: Record<string, unknown>;
};

// Load all fixtures at startup.
const fixtures = {
  trademark: loadFixture('trademark'),
  copyright: loadFixture('copyright'),
  payment: loadFixture('payment'),
  recommendation: loadFixture('recommendation')
} as const;

// Load once, fail fast if missing.
function loadFixture(name: string): Fixture {
  try {
    return JSON.parse(
      readFileSync(
        path.join(__dirname, `${name}.json`), 
        'utf8'
      )
    );
  } catch (error) {
    logger.error({ error, fixture: name }, 'Failed to load fixture');
    process.exit(1); // Fail fast if fixtures are broken.
  }
}

// Simple export 
export const testData = fixtures;