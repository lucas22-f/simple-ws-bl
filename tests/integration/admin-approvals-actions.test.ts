import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/server/admin/actions/auth", () => ({
  assertCurrentUserIsAdmin: vi.fn(),
}));

import { assertCurrentUserIsAdmin } from "@/server/admin/actions/auth";
import {
  listPendingAdminsAction,
  approveAdminAction,
  rejectAdminAction,
  type PendingAdmin,
} from "@/server/admin/actions/approvals";

type MockOverrides = {
  pendingAdmins?: PendingAdmin[];
  updateError?: Error;
  deleteError?: Error;
};

/** Creates a thenable fluent-query mock: awaitable + .eq() returns self. */
function createQueryMock<T>(response: T) {
  const promise = Promise.resolve(response);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query = Object.assign(promise, {
    eq: vi.fn(() => query) as any,
  });
  return query as Promise<T> & { eq: ReturnType<typeof vi.fn> };
}

function createApprovalsMock(overrides: MockOverrides = {}) {
  const pendingAdmins = overrides.pendingAdmins ?? [];
  const deleteUser = vi.fn(async () =>
    overrides.deleteError
      ? { data: null, error: overrides.deleteError }
      : { data: {}, error: null },
  );
  const selectQuery = createQueryMock({ data: pendingAdmins, error: null });
  const updateQuery = createQueryMock({ data: null, error: overrides.updateError ?? null });
  const selectFn = vi.fn((_columns: string) => selectQuery);
  const updateFn = vi.fn((_values: Record<string, unknown>) => updateQuery);

  return {
    adminClient: {
      auth: { admin: { deleteUser } },
      from: vi.fn((_table: string) => ({
        select: selectFn,
        update: updateFn,
      })),
    },
    deleteUser,
    selectQuery,
    updateQuery,
    selectFn,
    updateFn,
  };
}

function mockAdminUser() {
  (assertCurrentUserIsAdmin as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
}

function mockNonAdminUser() {
  (assertCurrentUserIsAdmin as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("No autorizado"));
}

describe("admin approvals actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listPendingAdminsAction", () => {
    it("returns pending admins for an approved admin", async () => {
      mockAdminUser();
      const mocks = createApprovalsMock({
        pendingAdmins: [
          { id: "admin-1", created_at: "2026-06-01T00:00:00.000Z" },
          { id: "admin-2", created_at: "2026-06-02T00:00:00.000Z" },
        ],
      });

      const result = await listPendingAdminsAction({ adminClient: mocks.adminClient });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: "admin-1", created_at: "2026-06-01T00:00:00.000Z" });
      expect(mocks.adminClient.from).toHaveBeenCalledWith("profiles");
      expect(mocks.selectFn).toHaveBeenCalledWith("id, created_at");
      expect(mocks.selectQuery.eq).toHaveBeenCalledTimes(2);
      expect(mocks.selectQuery.eq).toHaveBeenCalledWith("role", "admin");
      expect(mocks.selectQuery.eq).toHaveBeenCalledWith("admin_status", "pending");
    });

    it("throws when the current user is not an admin", async () => {
      mockNonAdminUser();
      const mocks = createApprovalsMock();

      await expect(listPendingAdminsAction({ adminClient: mocks.adminClient })).rejects.toThrow("No autorizado");
      expect(mocks.adminClient.from).not.toHaveBeenCalled();
    });

    it("returns an empty array when no pending admins exist", async () => {
      mockAdminUser();
      const mocks = createApprovalsMock({ pendingAdmins: [] });

      const result = await listPendingAdminsAction({ adminClient: mocks.adminClient });

      expect(result).toEqual([]);
    });
  });

  describe("approveAdminAction", () => {
    it("updates admin_status to approved for an existing pending admin", async () => {
      mockAdminUser();
      const mocks = createApprovalsMock();

      const result = await approveAdminAction("user-123", { adminClient: mocks.adminClient });

      expect(result).toEqual({ success: true });
      expect(mocks.adminClient.from).toHaveBeenCalledWith("profiles");
      expect(mocks.updateFn).toHaveBeenCalledWith({ admin_status: "approved" });
      expect(mocks.updateQuery.eq).toHaveBeenCalledTimes(2);
      expect(mocks.updateQuery.eq).toHaveBeenCalledWith("id", "user-123");
      expect(mocks.updateQuery.eq).toHaveBeenCalledWith("admin_status", "pending");
    });

    it("throws when the current user is not an admin", async () => {
      mockNonAdminUser();
      const mocks = createApprovalsMock();

      await expect(approveAdminAction("user-123", { adminClient: mocks.adminClient })).rejects.toThrow("No autorizado");
      expect(mocks.adminClient.from).not.toHaveBeenCalled();
    });

    it("only targets profiles with admin_status = pending", async () => {
      mockAdminUser();
      const mocks = createApprovalsMock();

      await approveAdminAction("user-456", { adminClient: mocks.adminClient });

      // The second .eq("admin_status", "pending") is the safety guard
      expect(mocks.updateQuery.eq).toHaveBeenCalledWith("admin_status", "pending");
    });
  });

  describe("rejectAdminAction", () => {
    it("deletes the auth user when rejecting a pending admin", async () => {
      mockAdminUser();
      const mocks = createApprovalsMock();

      const result = await rejectAdminAction("user-123", { adminClient: mocks.adminClient });

      expect(result).toEqual({ success: true });
      expect(mocks.adminClient.auth.admin.deleteUser).toHaveBeenCalledWith("user-123");
    });

    it("throws when the current user is not an admin", async () => {
      mockNonAdminUser();
      const mocks = createApprovalsMock();

      await expect(rejectAdminAction("user-123", { adminClient: mocks.adminClient })).rejects.toThrow("No autorizado");
      expect(mocks.adminClient.auth.admin.deleteUser).not.toHaveBeenCalled();
    });
  });
});
