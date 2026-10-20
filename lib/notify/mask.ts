// Personal data that may end up in notification text or logs (see CLAUDE.md, Privacy).

// Look-alike Cyrillic letters are included because people often type VINs on a Russian keyboard.
const VIN_CHARS = "A-Za-z0-9АВЕКМНОРСТУХавекмнорстух";
const VIN_LETTERS = "A-Za-zАВЕКМНОРСТУХавекмнорстух";

// Any 17-character run of VIN characters with at least one digit. I, O and Q are not excluded on purpose:
// a mistyped VIN is still somebody's VIN.
const VIN_LIKE = new RegExp(
  `(^|[^A-Za-z0-9])(?=[${VIN_LETTERS}]{0,16}\\d)([${VIN_CHARS}]{3})[${VIN_CHARS}]{10}([${VIN_CHARS}]{4})(?![A-Za-z0-9])`,
  "g",
);

// Same shape as maskVin in lib/vin: the WMI and the last four characters, "LTX…2345".
export const maskVins = (text: string) => String(text ?? "").replace(VIN_LIKE, "$1$2…$3");

// Only the last four digits: the country and operator prefix plus seven visible digits would identify the person.
export function maskPhoneForLog(phone: string | null | undefined): string {
  const digits = String(phone ?? "").replace(/\D/g, "");
  return digits.length > 4 ? `•••${digits.slice(-4)}` : "•••";
}
