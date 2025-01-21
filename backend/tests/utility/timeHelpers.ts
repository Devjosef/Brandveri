/**
 * Time manipulation utilities, for testing.
 */

export const mockDate = (date: Date = new Date('2025-21-01')) => {
    const RealDate = Date;
    (global as any).Date = class extends RealDate {
      constructor() {
        super();
        return new RealDate(date);
      }
    };
    return () => {
      global.Date = RealDate;
    };
  };
  
  export const waitFor = (ms: number): Promise<void> => 
    new Promise(resolve => setTimeout(resolve, ms));