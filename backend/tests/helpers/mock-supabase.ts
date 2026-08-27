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
  institute: Row[];
  institute_settings: Row[];
  role: Row[];
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
  class: Row[];
  subject: Row[];
  exam: Row[];
  exam_target_section: Row[];
  exam_subject_schedule: Row[];
  mark_entry: Row[];
  mark_score: Row[];
  homework: Row[];
  diary_day: Row[];
  diary_day_row: Row[];
  notification_template: Row[];
  notification: Row[];
  notification_recipient: Row[];
  notification_delivery_attempt: Row[];
  device_token: Row[];
  license: Row[];
  module_entitlement: Row[];
  subscription: Row[];
  subscription_period: Row[];
  renewal_record: Row[];
  billing_adjustment: Row[];
  payment: Row[];
  audit_event: Row[];
  staff_account: Row[];
  fee_plan: Row[];
  fee_component: Row[];
  student_fee: Row[];
  fee_payment: Row[];
  concession: Row[];
  vehicle: Row[];
  driver: Row[];
  route: Row[];
  stop: Row[];
  transport_enrollment: Row[];
  transport_settings: Row[];
  leave_request: Row[];
  leave_decision: Row[];
  event: Row[];
  announcement: Row[];
  staff_attendance: Row[];
  complaint: Row[];
  template: Row[];
  generated_document: Row[];
  issued_certificate: Row[];
  admission_program: Row[];
  admission_opening: Row[];
  admission_application: Row[];
  admission_document: Row[];
  admission_inquiry: Row[];
  career_job: Row[];
  candidate_profile: Row[];
  career_application: Row[];
  career_inquiry: Row[];
  talent_pool_entry: Row[];
  user_saved_item: Row[];
  activity_section: Row[];
  activity_team: Row[];
  activity_membership: Row[];
  achievement: Row[];
  practice_session: Row[];
  message_thread: Row[];
  message: Row[];
  stored_asset: Row[];
  recycle_item: Row[];
  support_thread: Row[];
  support_message: Row[];
  policy_rule: Row[];
  storage_quota: Row[];
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
  private mutateMode: "none" | "insert" | "update" | "delete" = "none";
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

  delete() {
    this.mutateMode = "delete";
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

  gte(column: string, value: unknown) {
    this.filters.push((r) => {
      const cell = r[column];
      if (cell == null || value == null) return false;
      return String(cell) >= String(value);
    });
    return this;
  }

  lte(column: string, value: unknown) {
    this.filters.push((r) => {
      const cell = r[column];
      if (cell == null || value == null) return false;
      return String(cell) <= String(value);
    });
    return this;
  }

  not(column: string, operator: string, value: unknown) {
    if (operator === "is" && value === null) {
      this.filters.push((r) => r[column] != null);
      return this;
    }
    this.filters.push((r) => r[column] !== value);
    return this;
  }

  order(_column: string, _opts?: { ascending?: boolean }) {
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

    if (this.mutateMode === "delete") {
      const matched = applyFilters(rows, this.filters);
      const remaining = rows.filter((r) => !matched.includes(r));
      rows.length = 0;
      rows.push(...remaining);
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
    institute: [],
    institute_settings: [],
    role: [],
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
    class: [],
    subject: [],
    exam: [],
    exam_target_section: [],
    exam_subject_schedule: [],
    mark_entry: [],
    mark_score: [],
    homework: [],
    diary_day: [],
    diary_day_row: [],
    notification_template: [],
    notification: [],
    notification_recipient: [],
    notification_delivery_attempt: [],
    device_token: [],
    license: [],
    module_entitlement: [],
    subscription: [],
    subscription_period: [],
    renewal_record: [],
    billing_adjustment: [],
    payment: [],
    audit_event: [],
    staff_account: [],
    fee_plan: [],
    fee_component: [],
    student_fee: [],
    fee_payment: [],
    concession: [],
    vehicle: [],
    driver: [],
    route: [],
    stop: [],
    transport_enrollment: [],
    transport_settings: [],
    leave_request: [],
    leave_decision: [],
    event: [],
    announcement: [],
    staff_attendance: [],
    complaint: [],
    template: [],
    generated_document: [],
    issued_certificate: [],
    admission_program: [],
    admission_opening: [],
    admission_application: [],
    admission_document: [],
    admission_inquiry: [],
    career_job: [],
    candidate_profile: [],
    career_application: [],
    career_inquiry: [],
    talent_pool_entry: [],
    user_saved_item: [],
    activity_section: [],
    activity_team: [],
    activity_membership: [],
    achievement: [],
    practice_session: [],
    message_thread: [],
    message: [],
    stored_asset: [],
    recycle_item: [],
    support_thread: [],
    support_message: [],
    policy_rule: [],
    storage_quota: [],
  };
}
