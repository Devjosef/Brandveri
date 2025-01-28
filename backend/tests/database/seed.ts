import { testDb } from './dbTest';
import { QueryResult, QueryResultRow } from 'pg';

interface User {
  id: number;
  email: string;
  created_at: Date;
}

interface Trademark {
  id: number;
  name: string;
  status: 'PENDING' | 'REGISTERED' | 'REJECTED';
  nice_classes: number[];
  user_id: number;
  created_at: Date;
}

// Factory pattern for generating test data
class Factory<T> {
  private sequence = 1;

  constructor(
    private readonly create: (data: Partial<T>) => Promise<T>,
    private readonly defaults: () => Partial<T>
  ) {}

  async make(override: Partial<T> = {}): Promise<T> {
    const data = {
      ...this.defaults(),
      ...override
    };
    return this.create(data);
  }

  async makeMany(count: number, override: Partial<T> = {}): Promise<T[]> {
    return Promise.all(
      Array.from({ length: count }, () => this.make(override))
    );
  }

  getSequence(): number {
    return this.sequence++;
  }
}

// Type-safe factories
type UserFactory = Factory<User>;
type TrademarkFactory = Factory<Trademark>;

interface Factories {
  user: UserFactory;
  trademark: TrademarkFactory;
}

// Helper type for pg query method
type PgQuery = <T extends QueryResultRow>(text: string, values?: any[]) => Promise<QueryResult<T>>;

export const factories: Factories = {
  user: new Factory<User>(
    async (data) => {
      const query = testDb.query as PgQuery;
      const result = await query<User>(
        `INSERT INTO test_users (email) 
         VALUES ($1)
         RETURNING *`,
        [data.email]
      );
      if (!result.rows[0]) throw new Error('Failed to create user');
      return result.rows[0];
    },
    () => ({
      email: `user${factories.user.getSequence()}@example.com`
    })
  ),

  trademark: new Factory<Trademark>(
    async (data) => {
      const query = testDb.query as PgQuery;
      const result = await query<Trademark>(
        `INSERT INTO test_trademarks 
         (name, status, nice_classes, user_id) 
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [
          data.name,
          data.status,
          data.nice_classes,
          data.user_id
        ]
      );
      if (!result.rows[0]) throw new Error('Failed to create trademark');
      return result.rows[0];
    },
    () => ({
      name: `Brand ${factories.trademark.getSequence()}`,
      status: 'PENDING' as const,
      nice_classes: [9, 42],
      user_id: 1
    })
  )
};

// Common seed scenarios
export const seed = {
  async basic(): Promise<{ user: User; trademark: Trademark }> {
    const user = await factories.user.make();
    const trademark = await factories.trademark.make({ user_id: user.id });
    return { user, trademark };
  },

  async multiple(): Promise<{ users: User[]; trademarks: Trademark[] }> {
    const users = await factories.user.makeMany(3);
    const trademarks = await Promise.all(
      users.map(user => 
        factories.trademark.makeMany(2, { user_id: user.id })
      )
    );
    return { users, trademarks: trademarks.flat() };
  },

  async withStatus(status: Trademark['status']): Promise<{ user: User; trademark: Trademark }> {
    const user = await factories.user.make();
    const trademark = await factories.trademark.make({
      user_id: user.id,
      status
    });
    return { user, trademark };
  },

  async clean(): Promise<void> {
    await testDb.query('TRUNCATE test_users, test_trademarks CASCADE');
  }
};