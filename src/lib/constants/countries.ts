export interface CountryConfig {
  code: string; // ISO 2-letter code
  name: string;
  dialCode: string;
  flag: string;
  digitLength: number; // expected national number length
  minLength?: number;
  maxLength?: number;
  pattern: RegExp; // Carrier prefix & length matching regex
  prefixHelp: string; // Friendly help hint for valid mobile prefixes
  placeholder: string;
  regionLabel: string; // "District", "Emirate", "Municipality", "Governorate", "Region"
  regions: string[];
}

export const COUNTRIES: CountryConfig[] = [
  {
    code: "IN",
    name: "India",
    dialCode: "+91",
    flag: "🇮🇳",
    digitLength: 10,
    pattern: /^[6-9]\d{9}$/,
    prefixHelp: "Mobile number must start with 6, 7, 8, or 9",
    placeholder: "10 digits (e.g. 9847012345)",
    regionLabel: "District",
    regions: [
      "Ernakulam",
      "Thiruvananthapuram",
      "Kollam",
      "Pathanamthitta",
      "Alappuzha",
      "Kottayam",
      "Idukki",
      "Thrissur",
      "Palakkad",
      "Malappuram",
      "Kozhikode",
      "Wayanad",
      "Kannur",
      "Kasaragod",
      "Other (Outside Kerala)",
    ],
  },
  {
    code: "AE",
    name: "United Arab Emirates",
    dialCode: "+971",
    flag: "🇦🇪",
    digitLength: 9,
    pattern: /^5[024568]\d{7}$/,
    prefixHelp: "UAE mobile number must start with 50, 52, 54, 55, 56, or 58",
    placeholder: "9 digits (e.g. 501234567)",
    regionLabel: "Emirate",
    regions: [
      "Dubai",
      "Abu Dhabi",
      "Sharjah",
      "Ajman",
      "Ras Al Khaimah",
      "Fujairah",
      "Umm Al Quwain",
    ],
  },
  {
    code: "SA",
    name: "Saudi Arabia",
    dialCode: "+966",
    flag: "🇸🇦",
    digitLength: 9,
    pattern: /^5\d{8}$/,
    prefixHelp: "Saudi mobile number must start with 5 (e.g. 50, 53, 55)",
    placeholder: "9 digits (e.g. 501234567)",
    regionLabel: "Region / City",
    regions: [
      "Riyadh",
      "Jeddah",
      "Dammam",
      "Mecca",
      "Medina",
      "Khobar",
      "Tabuk",
      "Abha",
      "Buraidah",
      "Other",
    ],
  },
  {
    code: "QA",
    name: "Qatar",
    dialCode: "+974",
    flag: "🇶🇦",
    digitLength: 8,
    pattern: /^[3567]\d{7}$/,
    prefixHelp: "Qatar mobile number must start with 3, 5, 6, or 7",
    placeholder: "8 digits (e.g. 33123456)",
    regionLabel: "Municipality / City",
    regions: [
      "Doha",
      "Al Rayyan",
      "Al Wakrah",
      "Al Khor",
      "Umm Salal",
      "Al Daayen",
      "Madinat ash Shamal",
      "Other",
    ],
  },
  {
    code: "OM",
    name: "Oman",
    dialCode: "+968",
    flag: "🇴🇲",
    digitLength: 8,
    pattern: /^[79]\d{7}$/,
    prefixHelp: "Oman mobile number must start with 7 or 9",
    placeholder: "8 digits (e.g. 91234567)",
    regionLabel: "Governorate / City",
    regions: [
      "Muscat",
      "Salalah",
      "Sohar",
      "Nizwa",
      "Sur",
      "Seeb",
      "Rustaq",
      "Barka",
      "Other",
    ],
  },
  {
    code: "KW",
    name: "Kuwait",
    dialCode: "+965",
    flag: "🇰🇼",
    digitLength: 8,
    pattern: /^[569]\d{7}$/,
    prefixHelp: "Kuwait mobile number must start with 5, 6, or 9",
    placeholder: "8 digits (e.g. 51234567)",
    regionLabel: "Governorate / City",
    regions: [
      "Kuwait City",
      "Hawalli",
      "Salmiya",
      "Ahmadi",
      "Farwaniya",
      "Jahra",
      "Mubarak Al-Kabeer",
      "Other",
    ],
  },
  {
    code: "BH",
    name: "Bahrain",
    dialCode: "+973",
    flag: "🇧🇭",
    digitLength: 8,
    pattern: /^[36]\d{7}$/,
    prefixHelp: "Bahrain mobile number must start with 3 or 6",
    placeholder: "8 digits (e.g. 36123456)",
    regionLabel: "Governorate / City",
    regions: [
      "Manama",
      "Riffa",
      "Muharraq",
      "Hamad Town",
      "Sitra",
      "Isa Town",
      "Budaiya",
      "Other",
    ],
  },
];

export const DEFAULT_COUNTRY = COUNTRIES[0]; // India (+91)

export function getCountryByCode(code: string): CountryConfig {
  return COUNTRIES.find((c) => c.code === code) || DEFAULT_COUNTRY;
}

export function getCountryByDialCode(dialCode: string): CountryConfig {
  const cleanDial = dialCode.startsWith("+") ? dialCode : `+${dialCode}`;
  return COUNTRIES.find((c) => c.dialCode === cleanDial) || DEFAULT_COUNTRY;
}

/**
 * Checks if a phone digit sequence is an obvious dummy/invalid number.
 * e.g., 0000000000, 1111111111, 9999999999, 1234567890, 9876543210
 */
export function isDummyPhoneNumber(digits: string): boolean {
  if (!digits) return true;

  // 1. All same digits (e.g. 0000000000, 9999999999)
  if (/^(\d)\1+$/.test(digits)) return true;

  // 2. Ascending sequential digits (e.g. 1234567890, 0123456789)
  const sequentialAscending = "0123456789012345";
  if (sequentialAscending.includes(digits)) return true;

  // 3. Descending sequential digits (e.g. 9876543210, 876543210)
  const sequentialDescending = "9876543210987654";
  if (sequentialDescending.includes(digits)) return true;

  // 4. Repeated 2-digit patterns (e.g. 1212121212, 9898989898)
  if (/^(\d{2})\1+$/.test(digits)) return true;

  return false;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates a national phone number against country regex and anti-dummy rules.
 */
export function validatePhoneNumberStrict(
  phone: string,
  country: CountryConfig
): ValidationResult {
  const cleanDigits = phone.replace(/\D/g, "");

  if (!cleanDigits) {
    return { isValid: false, error: "Phone number is required." };
  }

  if (cleanDigits.length < country.digitLength) {
    return {
      isValid: false,
      error: `Please enter all ${country.digitLength} digits for ${country.name}.`,
    };
  }

  if (cleanDigits.length > country.digitLength) {
    return {
      isValid: false,
      error: `Mobile number in ${country.name} must be exactly ${country.digitLength} digits.`,
    };
  }

  // Check carrier prefix & regex pattern
  if (!country.pattern.test(cleanDigits)) {
    return {
      isValid: false,
      error: `Invalid number format for ${country.name}. ${country.prefixHelp}.`,
    };
  }

  // Anti-dummy check
  if (isDummyPhoneNumber(cleanDigits)) {
    return {
      isValid: false,
      error: "Invalid dummy phone number. Please enter your real mobile number.",
    };
  }

  return { isValid: true };
}

/**
 * Validates a full E.164 phone string (e.g. +971501234567 or +919847012345)
 */
export function validateFullE164PhoneStrict(fullPhone: string): ValidationResult {
  const clean = fullPhone.trim();
  if (!clean) {
    return { isValid: false, error: "Phone number is required." };
  }

  // Find matching country by dial code prefix
  let matchedCountry = COUNTRIES.find((c) => clean.startsWith(c.dialCode));

  if (!matchedCountry) {
    // Fallback: search without +
    const digitsOnly = clean.replace(/\D/g, "");
    matchedCountry = COUNTRIES.find((c) =>
      digitsOnly.startsWith(c.dialCode.replace("+", ""))
    );
  }

  if (!matchedCountry) {
    // Default fallback to India if no dial code matched
    const digitsOnly = clean.replace(/\D/g, "");
    if (digitsOnly.length === 10) {
      matchedCountry = DEFAULT_COUNTRY;
      return validatePhoneNumberStrict(digitsOnly, matchedCountry);
    }
    return {
      isValid: false,
      error: "Please enter a valid mobile number with supported country code (India or GCC).",
    };
  }

  const dialCodeDigits = matchedCountry.dialCode.replace("+", "");
  const cleanDigits = clean.replace(/\D/g, "");
  const nationalDigits = cleanDigits.startsWith(dialCodeDigits)
    ? cleanDigits.slice(dialCodeDigits.length)
    : cleanDigits;

  return validatePhoneNumberStrict(nationalDigits, matchedCountry);
}

/**
 * Formats country dial code and national digits into E.164 full number (e.g. +971501234567)
 */
export function formatE164(dialCode: string, nationalNumber: string): string {
  const cleanDigits = nationalNumber.replace(/\D/g, "");
  const cleanDial = dialCode.startsWith("+") ? dialCode : `+${dialCode}`;
  return `${cleanDial}${cleanDigits}`;
}

/**
 * Normalizes an incoming phone string into E.164 format.
 */
export function normalizePhoneForStorage(dialCode: string, phone: string): string {
  const cleanPhone = phone.trim();
  if (cleanPhone.startsWith("+")) {
    return cleanPhone.replace(/[^\d+]/g, "");
  }
  const cleanDigits = cleanPhone.replace(/\D/g, "");
  const cleanDial = dialCode.startsWith("+") ? dialCode : `+${dialCode}`;
  return `${cleanDial}${cleanDigits}`;
}
