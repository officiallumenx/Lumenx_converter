/**
 * Minimal in-memory Supabase admin mock for foundation + domain tests.
 * Supports the query chains used by session/auth and timetable repositories.
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
  section: Row[];
  timetable_slot: Row[];
  enrollment: Row[];
  guardian_link: Row[];
  attendance_config_version: Row[];
  attendance_register: Row[];
  attendance_mark: Row[];
  academic_year: Row[];
  subject: Row[];
  exam: Row[];
  exam_target_section: Row[];
  exam_subject_schedule: Row[];
};

export type MockDbError = { code: string; message?: string };

type PendingError = MockDbError | null;

function applyFilters(rows: Row[], filters: Array<(r: Row) => boolean>): Row[] {
  return rows.filter((r) => filters.every((f) => f(r)));
}

function newId(): string {
  return crypto.randomUUID();
}

class QueryBuilder {
  private filters: Array<(r: Row) => boolean> = [];
  private mutateMode: "none" | "insert" | "update" = "none";
  private insertRows: Row[] = [];
  private updatePatch: Row = {};
  private pendingError: PendingError = null;

  constructor(
    private readonly table: string,
    private readonly db: MockDb,
    private readonly errorQueue: PendingError[],
  ) {
    this.pendingError = errorQueue.shift() ?? null;
  }

  select(_cols?: string) {
    return this;
  }

  insert(payload: Row | Row[]) {
    this.mutateMode = "insert";
    this.insertRows = Array.isArray(payload) ? payload : [payload];
    return this;
  }

  update(patch: Row) {
    this.mutateMode = "update";
    this.updatePatch = patch;
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

  private tableRows(): Row[] {
    if (!(this.table in this.db)) {
      (this.db as Record<string, Row[]>)[this.table] = [];
    }
    return (this.db[this.table as keyof MockDb] ?? []) as Row[];
  }

  private applyMutation(): { data: Row[]; error: MockDbError | null } {
    if (this.pendingError) {
      return { data: [], error: this.pendingError };
    }

    const rows = this.tableRows();

    if (this.mutateMode === "insert") {
      const created = this.insertRows.map((row) => {
        const now = new Date().toISOString();
        const next: Row = {
          id: (row.id as string) ?? newId(),
          created_at: now,
          updated_at: now,
          deleted_at: null,
          ...row,
        };
        rows.push(next);
        return next;
      });
      return { data: created, error: null };
    }

    if (this.mutateMode === "update") {
      const matched = applyFilters(rows, this.filters);
      const now = new Date().toISOString();
      for (const row of matched) {
        Object.assign(row, this.updatePatch, { updated_at: now });
      }
      return { data: matched.map((r) => ({ ...r })), error: null };
    }

    return { data: applyFilters(rows, this.filters).map((r) => ({ ...r })), error: null };
  }

  async maybeSingle() {
    const result = this.applyMutation();
    if (result.error) {
      return { data: null, error: result.error };
    }
    if (result.data.length === 0) {
      return { data: null, error: null };
    }
    return { data: result.data[0], error: null };
  }

  async single() {
    const result = this.applyMutation();
    if (result.error) {
      return { data: null, error: result.error };
    }
    if (result.data.length === 0) {
      return {
        data: null,
        error: { code: "PGRST116", message: "No rows found" },
      };
    }
    return { data: result.data[0], error: null };
  }

  then<TResult1 = { data: Row[]; error: null }, TResult2 = never>(
    onfulfilled?:
      | ((value: {
          data: Row[];
          error: MockDbError | null;
        }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    const result = this.applyMutation();
    return Promise.resolve(result).then(onfulfilled, onrejected);
  }
}

export function createMockSupabaseClients(options: {
  tokens: MockAuthUsers;
  db: MockDb;
  /** Optional queue of errors consumed by successive query builders. */
  nextErrors?: PendingError[];
}) {
  const errorQueue = options.nextErrors ?? [];

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
      return new QueryBuilder(table, options.db, errorQueue);
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
    section: [],
    timetable_slot: [],
    enrollment: [],
    guardian_link: [],
    attendance_config_version: [],
    attendance_register: [],
    attendance_mark: [],
    academic_year: [],
    subject: [],
    exam: [],
    exam_target_section: [],
    exam_subject_schedule: [],
  };
}
