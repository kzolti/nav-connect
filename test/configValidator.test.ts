import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateNavApiConfig, DEFAULT_HTTP_TIMEOUT_MS } from "../src/configValidator.js";
import { NavConfigError } from "../src/errors.js";
import type { NavApiConfig } from "../src/configValidator.js";

const validConfig: NavApiConfig = {
  testSystem: true,
  taxNumber: "12345678",
  technicalUser: {
    user: "testuser",
    password: "testpassword",
    signatureKey: "testsignaturekey",
    exchangeKey: "testexchange00000",
  },
  software: {
    softwareId: "123456789012345678",
    softwareName: "TestApp",
    softwareOperation: "LOCAL_SOFTWARE",
    softwareMainVersion: "1.0",
    softwareDevName: "Dev",
    softwareDevContact: "dev@test.com",
  },
};

function assertConfigError(config: unknown, expectedMessage: string): void {
  try {
    validateNavApiConfig(config as NavApiConfig);
    assert.fail(`expected NavConfigError containing "${expectedMessage}"`);
  } catch (err: unknown) {
    assert.ok(err instanceof NavConfigError, `expected NavConfigError, got ${(err as Error)?.constructor?.name}`);
    assert.ok(
      (err as NavConfigError).validationErrors.some((e) => e.includes(expectedMessage)),
      `expected error "${expectedMessage}" in ${JSON.stringify((err as NavConfigError).validationErrors)}`
    );
  }
}

void describe("validateNavApiConfig", () => {
  void it("accepts a valid config", () => {
    assert.doesNotThrow(() => validateNavApiConfig(validConfig));
  });

  void it("accepts a valid config with all optional fields", () => {
    assert.doesNotThrow(() =>
      validateNavApiConfig({
        ...validConfig,
        httpTimeoutMs: 30_000,
        minIntervalMs: 500,
        baseUrlOverride: "https://example.test",
        validateResponse: false,
      })
    );
  });

  void it("rejects a missing taxNumber", () => {
    assertConfigError({ ...validConfig, taxNumber: "" }, "taxNumber is required");
  });

  void it("rejects a taxNumber that is not exactly 8 digits", () => {
    assertConfigError({ ...validConfig, taxNumber: "123456789" }, "taxNumber must be exactly 8 digits");
    assertConfigError({ ...validConfig, taxNumber: "12a45678" }, "taxNumber must be exactly 8 digits");
  });

  void it("rejects a missing technicalUser", () => {
    assertConfigError({ ...validConfig, technicalUser: undefined }, "technicalUser is required");
  });

  void it("rejects an invalid technicalUser.user", () => {
    assertConfigError(
      { ...validConfig, technicalUser: { ...validConfig.technicalUser, user: "" } },
      "technicalUser.user is required"
    );
    assertConfigError(
      { ...validConfig, technicalUser: { ...validConfig.technicalUser, user: "bad user!" } },
      "technicalUser.user must match pattern"
    );
  });

  void it("rejects missing password, signatureKey and exchangeKey", () => {
    assertConfigError(
      { ...validConfig, technicalUser: { ...validConfig.technicalUser, password: "" } },
      "technicalUser.password is required"
    );
    assertConfigError(
      { ...validConfig, technicalUser: { ...validConfig.technicalUser, signatureKey: "  " } },
      "technicalUser.signatureKey is required"
    );
    assertConfigError(
      { ...validConfig, technicalUser: { ...validConfig.technicalUser, exchangeKey: "" } },
      "technicalUser.exchangeKey is required"
    );
  });

  void it("rejects an exchangeKey shorter than 16 bytes", () => {
    assertConfigError(
      { ...validConfig, technicalUser: { ...validConfig.technicalUser, exchangeKey: "too-short-key" } },
      "exchangeKey must be at least 16 bytes"
    );
  });

  void it("rejects a missing software block", () => {
    assertConfigError({ ...validConfig, software: undefined }, "software is required");
  });

  void it("rejects an invalid softwareId", () => {
    assertConfigError(
      { ...validConfig, software: { ...validConfig.software, softwareId: "short" } },
      "softwareId must be exactly 18 characters"
    );
    assertConfigError(
      { ...validConfig, software: { ...validConfig.software, softwareId: "12345678901234567_" } },
      "softwareId must be exactly 18 characters"
    );
  });

  void it("rejects an invalid softwareOperation", () => {
    assertConfigError(
      { ...validConfig, software: { ...validConfig.software, softwareOperation: "WEB_SERVICE" } },
      "softwareOperation must be either"
    );
  });

  void it("rejects an overlong softwareName and softwareMainVersion", () => {
    assertConfigError(
      { ...validConfig, software: { ...validConfig.software, softwareName: "x".repeat(51) } },
      "softwareName must not exceed 50 characters"
    );
    assertConfigError(
      { ...validConfig, software: { ...validConfig.software, softwareMainVersion: "x".repeat(16) } },
      "softwareMainVersion must not exceed 15 characters"
    );
  });

  void it("rejects a non-ISO softwareDevCountryCode", () => {
    assertConfigError(
      { ...validConfig, software: { ...validConfig.software, softwareDevCountryCode: "hungary" } },
      "softwareDevCountryCode must be a 2-letter"
    );
  });

  void it("rejects an invalid minIntervalMs", () => {
    assertConfigError({ ...validConfig, minIntervalMs: -1 }, "minIntervalMs must be a non-negative number");
    assertConfigError({ ...validConfig, minIntervalMs: Number.NaN }, "minIntervalMs must be a non-negative number");
  });

  void it("rejects an invalid httpTimeoutMs", () => {
    assertConfigError({ ...validConfig, httpTimeoutMs: 0 }, "httpTimeoutMs must be a positive number");
    assertConfigError({ ...validConfig, httpTimeoutMs: -5 }, "httpTimeoutMs must be a positive number");
  });

  void it("rejects a non-boolean validateResponse", () => {
    assertConfigError({ ...validConfig, validateResponse: "yes" }, "validateResponse must be a boolean");
  });

  void it("collects multiple errors into a single NavConfigError", () => {
    try {
      validateNavApiConfig({} as NavApiConfig);
      assert.fail("expected NavConfigError");
    } catch (err: unknown) {
      assert.ok(err instanceof NavConfigError);
      assert.ok((err as NavConfigError).validationErrors.length >= 3, "expected multiple validation errors");
    }
  });

  void it("exposes the default HTTP timeout", () => {
    assert.equal(DEFAULT_HTTP_TIMEOUT_MS, 55_000);
  });
});
