import { Buffer } from "node:buffer";
import type { SoftwareType } from "nav-osa-types";
import { NavConfigError } from "./errors.js";

export const DEFAULT_HTTP_TIMEOUT_MS = 55_000;

interface TechnicalUser {
  user: string;
  password: string;
  signatureKey: string;
  exchangeKey: string;
}

export interface NavApiConfig {
  testSystem: boolean;
  taxNumber: string;
  technicalUser: TechnicalUser;
  software: SoftwareType;
  httpTimeoutMs?: number;
  minIntervalMs?: number;
  baseUrlOverride?: string;
  validateResponse?: boolean;
}

export function validateNavApiConfig(config: NavApiConfig): void {
  const errors: string[] = [];

  if (!config.taxNumber) {
    errors.push("taxNumber is required");
  } else if (!/^\d{8}$/.test(config.taxNumber)) {
    errors.push("taxNumber must be exactly 8 digits");
  }

  if (!config.technicalUser) {
    errors.push("technicalUser is required");
  } else {
    if (!config.technicalUser.user || config.technicalUser.user.trim() === "") {
      errors.push("technicalUser.user is required");
    } else if (!/^[a-zA-Z0-9]{6,15}$/.test(config.technicalUser.user)) {
      errors.push("technicalUser.user must match pattern [a-zA-Z0-9]{6,15}");
    }
    if (!config.technicalUser.password || config.technicalUser.password.trim() === "") {
      errors.push("technicalUser.password is required");
    }
    if (!config.technicalUser.signatureKey || config.technicalUser.signatureKey.trim() === "") {
      errors.push("technicalUser.signatureKey is required");
    }
    if (!config.technicalUser.exchangeKey || config.technicalUser.exchangeKey.trim() === "") {
      errors.push("technicalUser.exchangeKey is required");
    } else if (Buffer.byteLength(config.technicalUser.exchangeKey, "utf8") < 16) {
      errors.push("technicalUser.exchangeKey must be at least 16 bytes (the first 16 bytes are used as the AES-128 key)");
    }
  }

  if (config.minIntervalMs !== undefined && (!Number.isFinite(config.minIntervalMs) || config.minIntervalMs < 0)) {
    errors.push("minIntervalMs must be a non-negative number");
  }

  if (config.httpTimeoutMs !== undefined && (!Number.isFinite(config.httpTimeoutMs) || config.httpTimeoutMs <= 0)) {
    errors.push("httpTimeoutMs must be a positive number");
  }

  if (config.validateResponse !== undefined && typeof config.validateResponse !== "boolean") {
    errors.push("validateResponse must be a boolean");
  }

  if (config.baseUrlOverride !== undefined && (typeof config.baseUrlOverride !== "string" || config.baseUrlOverride.trim() === "")) {
    errors.push("baseUrlOverride must be a non-empty string");
  }

  if (!config.software) {
    errors.push("software is required");
  } else {
    if (!config.software.softwareId) {
      errors.push("software.softwareId is required");
    } else if (!/^[0-9A-Z\-]{18}$/.test(config.software.softwareId)) {
      errors.push("software.softwareId must be exactly 18 characters matching pattern [0-9A-Z\\-]");
    }

    if (!config.software.softwareName || config.software.softwareName.trim() === "") {
      errors.push("software.softwareName is required (max 50 characters)");
    } else if (config.software.softwareName.length > 50) {
      errors.push("software.softwareName must not exceed 50 characters");
    }

    if (!config.software.softwareOperation) {
      errors.push("software.softwareOperation is required");
    } else if (!["LOCAL_SOFTWARE", "ONLINE_SERVICE"].includes(config.software.softwareOperation)) {
      errors.push("software.softwareOperation must be either 'LOCAL_SOFTWARE' or 'ONLINE_SERVICE'");
    }

    if (!config.software.softwareMainVersion || config.software.softwareMainVersion.trim() === "") {
      errors.push("software.softwareMainVersion is required (max 15 characters)");
    } else if (config.software.softwareMainVersion.length > 15) {
      errors.push("software.softwareMainVersion must not exceed 15 characters");
    }

    if (!config.software.softwareDevName || config.software.softwareDevName.trim() === "") {
      errors.push("software.softwareDevName is required (max 512 characters)");
    } else if (config.software.softwareDevName.length > 512) {
      errors.push("software.softwareDevName must not exceed 512 characters");
    }

    if (!config.software.softwareDevContact || config.software.softwareDevContact.trim() === "") {
      errors.push("software.softwareDevContact is required (max 200 characters)");
    } else if (config.software.softwareDevContact.length > 200) {
      errors.push("software.softwareDevContact must not exceed 200 characters");
    }

    if (config.software.softwareDevCountryCode && !/^[A-Z]{2}$/.test(config.software.softwareDevCountryCode)) {
      errors.push("software.softwareDevCountryCode must be a 2-letter ISO-3166 alpha-2 country code");
    }

    if (config.software.softwareDevTaxNumber && config.software.softwareDevTaxNumber.length > 50) {
      errors.push("software.softwareDevTaxNumber must not exceed 50 characters");
    }
  }

  if (errors.length > 0) {
    throw new NavConfigError(errors);
  }
}