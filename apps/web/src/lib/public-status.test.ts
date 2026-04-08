import { resolvePublicStatusSubtitle, resolvePublicStatusTitle } from "@/lib/public-status";

describe("public status presentation helpers", () => {
  it("prefers custom values when present", () => {
    expect(resolvePublicStatusTitle({ name: "Workspace A", public_status_title: "Operations SSL Board" }, "Fallback")).toBe("Operations SSL Board");
    expect(resolvePublicStatusSubtitle({ public_status_subtitle: "Live certificate health overview" }, "Fallback")).toBe("Live certificate health overview");
  });

  it("falls back to workspace name or default copy when custom values are missing", () => {
    expect(resolvePublicStatusTitle({ name: "Workspace A", public_status_title: "" }, "Fallback")).toBe("Workspace A");
    expect(resolvePublicStatusTitle(undefined, "Fallback")).toBe("Fallback");
    expect(resolvePublicStatusSubtitle({ public_status_subtitle: "" }, "Fallback")).toBe("Fallback");
  });
});
