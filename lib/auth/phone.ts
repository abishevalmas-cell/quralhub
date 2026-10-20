// Phone numbers are stored as E.164 without the plus sign: 77011234567, 998901234567, 996555123456.
const COUNTRIES: { prefix: string; length: number; country: string }[] = [
  { prefix: "998", length: 12, country: "UZ" },
  { prefix: "996", length: 12, country: "KG" },
  { prefix: "7", length: 11, country: "KZ/RU" },
];

export function normalizePhone(input: string): string | null {
  let digits = String(input ?? "").replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  else if (digits.length === 11 && digits.startsWith("8")) digits = "7" + digits.slice(1);
  else if (digits.length === 10 && digits.startsWith("7")) digits = "7" + digits;
  if (!/^\d+$/.test(digits)) return null;
  const match = COUNTRIES.find((c) => digits.startsWith(c.prefix) && digits.length === c.length);
  return match ? digits : null;
}

export function formatPhone(phone: string): string {
  if (phone.startsWith("7") && phone.length === 11)
    return `+7 ${phone.slice(1, 4)} ${phone.slice(4, 7)} ${phone.slice(7, 9)} ${phone.slice(9)}`;
  if (phone.length === 12) return `+${phone.slice(0, 3)} ${phone.slice(3, 5)} ${phone.slice(5, 8)} ${phone.slice(8, 10)} ${phone.slice(10)}`;
  return "+" + phone;
}

export function maskPhone(phone: string): string {
  return phone.length > 4 ? "+" + phone.slice(0, phone.length - 4).replace(/\d(?=\d{3})/g, "•") + phone.slice(-4) : "•••";
}
