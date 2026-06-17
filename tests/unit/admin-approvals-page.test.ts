import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { ApprovalsList } from "@/app/admin/approvals/approvals-list";

describe("ApprovalsList", () => {
  it("renders pending admins with approve and reject buttons", () => {
    const pendingAdmins = [
      { id: "admin-1", created_at: "2026-06-15T10:00:00Z" },
      { id: "admin-2", created_at: "2026-06-16T14:30:00Z" },
    ];

    const approveAction = vi.fn();
    const rejectAction = vi.fn();

    const html = renderToStaticMarkup(
      createElement(ApprovalsList, {
        pendingAdmins,
        approveAction,
        rejectAction,
      }),
    );

    expect(html).toContain("admin-1");
    expect(html).toContain("admin-2");
    expect(html).toContain("Aprobar");
    expect(html).toContain("Rechazar");
  });

  it("shows empty state when there are no pending admins", () => {
    const approveAction = vi.fn();
    const rejectAction = vi.fn();

    const html = renderToStaticMarkup(
      createElement(ApprovalsList, {
        pendingAdmins: [],
        approveAction,
        rejectAction,
      }),
    );

    expect(html).toContain("Aprobaciones");
    expect(html).not.toContain('value="admin');
  });
});
