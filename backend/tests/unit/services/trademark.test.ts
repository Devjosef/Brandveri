import { trademarkService } from '../../../services/trademark';
import { mockDb } from '../mocks/db';
import { mockCache } from '../mocks/cache';

describe('Trademark Service', () => {
  beforeEach(() => {
    mockDb.clear();
    mockCache.clear();
  });

  describe('creation', () => {
    it('creates valid trademark', async () => {
      const result = await trademarkService.create({
        name: 'Test Brand',
        niceClasses: [9, 42],
        userId: '123'
      });

      expect(result).toEqual({
        id: expect.any(String),
        name: 'Test Brand',
        status: 'PENDING',
        niceClasses: [9, 42],
        userId: '123'
      });
    });

    it('prevents duplicate names', async () => {
      await mockDb.trademarks.create({ name: 'Existing' });

      await expect(
        trademarkService.create({
          name: 'Existing',
          niceClasses: [9],
          userId: '123'
        })
      ).rejects.toThrow('Name already exists');
    });
  });

  describe('similarity check', () => {
    it('detects similar names', async () => {
      await mockDb.trademarks.create({
        name: 'Original Brand',
        status: 'REGISTERED'
      });

      const result = await trademarkService.checkSimilarity('Original Brands');
      
      expect(result).toEqual({
        similarity: expect.any(Number),
        conflicts: [{
          name: 'Original Brand',
          similarity: expect.any(Number)
        }]
      });
      expect(result.similarity).toBeGreaterThan(0.8);
    });
  });
});
