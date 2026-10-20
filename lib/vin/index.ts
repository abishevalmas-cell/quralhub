export {
  VIN_CHARSET,
  VIN_LENGTH,
  fromRussianLayout,
  hasCyrillicLookalikes,
  hasUnmappedCyrillic,
  normalizeVin,
} from "./normalize";
export { checkDigit, hasValidCheckDigit, makeVin } from "./check-digit";
export { isModelYearCode, modelYear } from "./year";
export { WMI_TABLE, type WmiConfidence, type WmiEntry } from "./wmi";
export { vinRegion, wmiInfo, type VinRegion, type WmiInfo } from "./manufacturer";
export {
  CHECK_DIGIT_MESSAGE,
  validateVin,
  type VinIssue,
  type VinIssueCode,
  type VinValidation,
} from "./validate";
export { maskVin, vinSummary } from "./format";
