# Types Architecture Documentation

## Overview
This document outlines the type system architecture, including custom types, type hierarchies, and type utilities used throughout the application.

## Core Types

### 1. Domain Types
- **User Types**
  ```typescript
  type User = {
    id: UUID;
    email: Email;
    role: UserRole;
    status: UserStatus;
    metadata: UserMetadata;
  };

  type UserRole = 'admin' | 'user' | 'guest';
  type UserStatus = 'active' | 'inactive' | 'suspended';
  ```

- **Business Types**
  ```typescript
  type Trademark = {
    id: UUID;
    name: string;
    status: TrademarkStatus;
    applicant: User;
    filingDate: ISODateTime;
  };
  ```

### 2. Utility Types
- **Common Utilities**
  ```typescript
  type Nullable<T> = T | null;
  type Optional<T> = T | undefined;
  type AsyncResult<T> = Promise<Result<T, Error>>;
  
  type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
  };
  ```

## Type Guards

### 1. Custom Guards
```typescript
// User type guards
function isAdmin(user: User): user is Admin {
  return user.role === 'admin';
}

// Result type guards
function isError<T>(result: Result<T, Error>): result is Error {
  return result instanceof Error;
}
```

### 2. Validation Types
```typescript
type Validator<T> = {
  validate: (value: unknown) => value is T;
  errors: ValidationError[];
};

type ValidationError = {
  path: string[];
  message: string;
  code: string;
};
```

## Generic Patterns

### 1. Service Types
```typescript
type Service<T> = {
  create: (data: Omit<T, 'id'>) => AsyncResult<T>;
  update: (id: UUID, data: Partial<T>) => AsyncResult<T>;
  delete: (id: UUID) => AsyncResult<void>;
  find: (id: UUID) => AsyncResult<T>;
  list: (query: QueryParams) => AsyncResult<T[]>;
};

type QueryParams = {
  limit?: number;
  offset?: number;
  sort?: SortParams;
  filter?: FilterParams;
};
```

### 2. Response Types
```typescript
type ApiResponse<T> = {
  data: T;
  meta: ResponseMetadata;
};

type ResponseMetadata = {
  timestamp: ISODateTime;
  requestId: UUID;
  pagination?: PaginationMeta;
};
```

## Type Hierarchies

### 1. Error Types
```typescript
type AppError = {
  code: string;
  message: string;
  stack?: string;
  cause?: Error;
};

type ValidationError extends AppError {
  field: string;
  value: unknown;
};

type AuthError extends AppError {
  userId?: UUID;
  action: string;
};
```

### 2. Event Types
```typescript
type Event<T = unknown> = {
  id: UUID;
  type: string;
  payload: T;
  timestamp: ISODateTime;
  source: string;
};

type DomainEvent<T> = Event<T> & {
  aggregateId: UUID;
  version: number;
};
```

## Best Practices

### 1. Type Safety
- Strict null checks
- No any usage
- Explicit return types
- Proper type narrowing

### 2. Type Organization
- Domain-driven type grouping
- Consistent naming conventions
- Type documentation
- Version compatibility

## Type Utils

### 1. Common Utils
```typescript
type Pick<T, K extends keyof T> = {
  [P in K]: T[P];
};

type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

type Required<T> = {
  [P in keyof T]-?: T[P];
};
```

### 2. Custom Utils
```typescript
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object 
    ? DeepReadonly<T[P]> 
    : T[P];
};

type RecursivePartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
    ? RecursivePartial<U>[]
    : T[P] extends object
    ? RecursivePartial<T[P]>
    : T[P];
};
