import { testDb } from './dbTest';

// Type definitions
interface QueryResult<T> {
  rows: T[];
  rowCount: number;
  command: string;
  oid: number;
  fields: FieldInfo[];
}

interface FieldInfo {
  name: string;
  tableID: number;
  columnID: number;
  dataTypeID: number;
  dataTypeSize: number;
  dataTypeModifier: number;
  format: string;
}

interface Trademark {
  id: number;
  name: string;
  status: TrademarkStatus;
  nice_classes: number[];
  created_at: Date;
  user_id: number;
}

type TrademarkStatus = 'PENDING' | 'REGISTERED' | 'REJECTED';
type CreateTrademarkDTO = Omit<Trademark, 'id' | 'created_at'>;
type QueryParam = string | number | boolean | Date | null | number[];

// Helper type for pg query method
type PgQuery = <T>(text: string, values?: any[]) => Promise<QueryResult<T>>;

class RepositoryError extends Error {
  constructor(
    public code: 'NOT_FOUND' | 'INVALID_UPDATE' | 'CONSTRAINT_VIOLATION',
    message: string
  ) {
    super(message);
    this.name = 'RepositoryError';
  }
}

function validateQueryParam(value: unknown): value is QueryParam {
  return value !== undefined && 
    (typeof value === 'string' ||
     typeof value === 'number' ||
     typeof value === 'boolean' ||
     value instanceof Date ||
     value === null ||
     (Array.isArray(value) && value.every(v => typeof v === 'number')));
}

// Repository implementation
export const repositories = {
  trademark: {
    async create(data: CreateTrademarkDTO): Promise<Trademark> {
      const values: QueryParam[] = [
        data.name,
        data.status,
        data.nice_classes,
        data.user_id
      ];

      if (!values.every(validateQueryParam)) {
        throw new RepositoryError(
          'CONSTRAINT_VIOLATION',
          'Invalid parameter types'
        );
      }

      const query = testDb.query as PgQuery;
      const result = await query<Trademark>(
        `INSERT INTO test_trademarks 
         (name, status, nice_classes, user_id) 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`,
        values
      );
      
      return result.rows[0];
    },

    async findById(id: number): Promise<Trademark | null> {
      if (!validateQueryParam(id)) {
        throw new RepositoryError(
          'CONSTRAINT_VIOLATION',
          'Invalid ID parameter'
        );
      }

      const query = testDb.query as PgQuery;
      const result = await query<Trademark>(
        'SELECT * FROM test_trademarks WHERE id = $1',
        [id]
      );
      
      return result.rows[0] || null;
    },

    async findByName(name: string): Promise<Trademark[]> {
      if (!validateQueryParam(name)) {
        throw new RepositoryError(
          'CONSTRAINT_VIOLATION',
          'Invalid name parameter'
        );
      }

      const query = testDb.query as PgQuery;
      const result = await query<Trademark>(
        'SELECT * FROM test_trademarks WHERE name ILIKE $1',
        [`%${name}%`]
      );
      
      return result.rows;
    },

    async update(id: number, data: Partial<CreateTrademarkDTO>): Promise<Trademark> {
      const sets: string[] = [];
      const values: QueryParam[] = [];
      let paramIndex = 1;

      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && validateQueryParam(value)) {
          sets.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      });

      if (sets.length === 0) {
        throw new RepositoryError(
          'INVALID_UPDATE',
          'No valid fields to update'
        );
      }

      values.push(id);
      const query = testDb.query as PgQuery;
      const result = await query<Trademark>(
        `UPDATE test_trademarks 
         SET ${sets.join(', ')} 
         WHERE id = $${paramIndex} 
         RETURNING *`,
        values
      );

      if (result.rowCount === 0) {
        throw new RepositoryError(
          'NOT_FOUND',
          `Trademark with id ${id} not found`
        );
      }

      return result.rows[0];
    },

    async delete(id: number): Promise<boolean> {
      if (!validateQueryParam(id)) {
        throw new RepositoryError(
          'CONSTRAINT_VIOLATION',
          'Invalid ID parameter'
        );
      }

      const query = testDb.query as PgQuery;
      const result = await query<Trademark>(
        'DELETE FROM test_trademarks WHERE id = $1',
        [id]
      );
      
      return result.rowCount > 0;
    }
  }
};