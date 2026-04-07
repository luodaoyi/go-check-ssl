import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api";
import { getLocalizedApiErrorMessage } from "@/lib/api-error";

describe("getLocalizedApiErrorMessage", () => {
  it("translates invalid credentials for Chinese locales", () => {
    expect(getLocalizedApiErrorMessage("zh-CN", new ApiError(401, "invalid credentials"), "fallback"))
      .toBe("用户名或密码错误。");
  });

  it("falls back by status for unknown server errors", () => {
    expect(getLocalizedApiErrorMessage("fr", new ApiError(500, "unexpected boom"), "fallback"))
      .toBe("Le serveur n'a pas pu traiter la requête.");
  });

  it("translates client-side selection errors", () => {
    expect(getLocalizedApiErrorMessage("en", new Error("No selected user"), "fallback"))
      .toBe("Select a user first.");
  });
});
