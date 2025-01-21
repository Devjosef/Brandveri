/**
 * Environment manipulation helpers for testing.
 */
export const withEnvOverride = async (
    overrides: Record<string, string>,
    testFn: () => Promise<void>
  ) => {
    const originalEnv = { ...process.env };
    try {
      Object.entries(overrides).forEach(([key, value]) => {
        process.env[key] = value;
      });
      await testFn();
    } finally {
      process.env = originalEnv;
    }
  };