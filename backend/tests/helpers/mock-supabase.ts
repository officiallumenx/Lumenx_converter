/**
 * Minimal in-memory Supabase admin mock for foundation tests.
 * Supports the query chains used by session/auth repositories.
 */

type Row = Record<string, unknown>;

type GetUserResult =
  | { data: { user: { id: string } }; error: null }
  | { data: { user: null }; error: { message: string } };

export type MockAuthUsers = Record<string, string>; // token -> userId

export type MockDb = {
  user_profile: Row[];
  membership: Row[];
  membership_role: Row[];
  platform_operator: Row[];
  teacher: Row[];
  student: Row[];
  parent: Row[];
  teacher_assignment: Row[];
};

function applyFilters(rows: Row[], filters: Array<(r: Row) => boolean>): Row[] {
  return rows.filter((r) => filters.every((f) => f(r)));
}

class QueryBuilder {
  private filters: Array<(r: Row) => boolean> = [];

  constructor(
    private readonly table: string,
    private readonly db: MockDb,
  ) {}

  select(_cols?: string) {
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push((r) => r[column] === value);
    return this;
  }

  is(column: string, value: null) {
    this.filters.push((r) => r[column] === value);
    return this;
  }

  in(column: string, values: unknown[]) {
    this.filters.push((r) => values.includes(r[column]));
    return this;
  }

  async maybeSingle() {
    const rows = applyFilters(this.rows(), this.filters);
    if (rows.length === 0) {
      return { data: null, error: null };
    }
    return { data: rows[0], error: null };
  }

  then<TResult1 = { data: Row[]; error: null }, TResult2 = never>(
    onfulfilled?:
      | ((value: { data: Row[]; error: null }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    const result = { data: applyFilters(this.rows(), this.filters), error: null };
    return Promise.resolve(result).then(onfulfilled, onrejected);
  }

  private rows(): Row[] {
    return (this.db[this.table as keyof MockDb] ?? []) as Row[];
  }
}

export function createMockSupabaseClients(options: {
  tokens: MockAuthUsers;
  db: MockDb;
}) {
  const admin = {
    auth: {
      async getUser(token: string): Promise<GetUserResult> {
        const userId = options.tokens[token];
        if (!userId) {
          return {
            data: { user: null },
            error: { message: "invalid JWT" },
          };
        }
        return { data: { user: { id: userId } }, error: null };
      },
    },
    from(table: string) {
      return new QueryBuilder(table, options.db);
    },
  };

  return {
    admin: admin as never,
    anon: admin as never,
    url: "https://example.supabase.co",
  };
}

export function emptyMockDb(): MockDb {
  return {
    user_profile: [],
    membership: [],
    membership_role: [],
    platform_operator: [],
    teacher: [],
    student: [],
    parent: [],
    teacher_assignment: [],
  };
}
