"use client";

import React from "react";
import { ChevronDown, AlertCircle } from "lucide-react";
import {
  COUNTRIES,
  CountryConfig,
  validatePhoneNumberStrict,
} from "@/lib/constants/countries";

interface CountryPhoneInputProps {
  selectedCountry: CountryConfig;
  onCountryChange: (country: CountryConfig) => void;
  phone: string;
  onPhoneChange: (phone: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  error?: string;
  showLiveValidation?: boolean;
}

export default function CountryPhoneInput({
  selectedCountry,
  onCountryChange,
  phone,
  onPhoneChange,
  required = false,
  disabled = false,
  className = "",
  error: customError,
  showLiveValidation = true,
}: CountryPhoneInputProps) {
  const handleCountrySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    const country = COUNTRIES.find((c) => c.code === code) || COUNTRIES[0];
    onCountryChange(country);
  };

  const handlePhoneInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleanDigits = e.target.value.replace(/\D/g, "");
    const truncated = cleanDigits.slice(0, selectedCountry.digitLength);
    onPhoneChange(truncated);
  };

  // Compute live validation result if user has typed something
  const liveValidation =
    showLiveValidation && phone.length > 0
      ? validatePhoneNumberStrict(phone, selectedCountry)
      : { isValid: true };

  const activeError = customError || (phone.length > 0 && !liveValidation.isValid ? liveValidation.error : undefined);

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div
        className={`flex rounded-xl border transition overflow-hidden bg-white ${
          activeError
            ? "border-red-400 focus-within:ring-2 focus-within:ring-red-400/20 focus-within:border-red-500"
            : "border-slate-200/90 focus-within:ring-2 focus-within:ring-[#5C34A4]/20 focus-within:border-[#5C34A4]"
        }`}
      >
        {/* Country Picker Dropdown */}
        <div className="relative flex items-center bg-slate-50 border-r border-slate-200/80 shrink-0">
          <select
            value={selectedCountry.code}
            onChange={handleCountrySelect}
            disabled={disabled}
            aria-label="Select Country Code"
            className="appearance-none bg-transparent pl-3 pr-6 py-2.5 text-xs font-bold text-slate-800 cursor-pointer focus:outline-none disabled:cursor-not-allowed"
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.dialCode} ({c.name})
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-1.5 pointer-events-none" />
        </div>

        {/* Mobile Phone Number Input */}
        <input
          type="tel"
          required={required}
          disabled={disabled}
          maxLength={selectedCountry.digitLength}
          placeholder={selectedCountry.placeholder}
          value={phone}
          onChange={handlePhoneInput}
          className="w-full px-3.5 py-2.5 bg-white text-slate-900 text-base font-bold placeholder:text-slate-400 placeholder:text-xs placeholder:font-normal focus:outline-none disabled:bg-slate-50 disabled:text-slate-500 font-mono tracking-widest"
        />
      </div>

      {/* Validation error feedback or prefix guidance helper */}
      {activeError ? (
        <p className="text-[11px] text-red-500 font-medium pl-1 flex items-center gap-1">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>{activeError}</span>
        </p>
      ) : (
        <p className="text-[10px] text-slate-400 pl-1">
          {selectedCountry.prefixHelp}
        </p>
      )}
    </div>
  );
}
