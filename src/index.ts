export { NavConnect } from "./client.js";
export type { NavApiResponse, DigestAllProgress } from "./client.js";
export {
  NavApiError,
  NavApiResponseError,
  NavApiHttpError,
  NavApiTimeoutError,
  NavXmlValidationError,
  NavResponseXmlValidationError,
  NavConfigError,
  NavDateRangeError,
  NavTaxNumberValidationError,
} from "./errors.js";
export { validateHuTaxNumber } from "./huTaxNumber.js";
export type { HuTaxNumberErrorCode, HuTaxNumberValidationResult } from "./huTaxNumber.js";
export type { NavApiConfig } from "./configValidator.js";

export { NavConnect as default } from "./client.js";