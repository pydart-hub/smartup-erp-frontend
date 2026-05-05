"use client";

import { FormEvent, useMemo, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { AlumniFormInput, AlumniQualificationLevel } from "@/lib/types/alumni";

type FormErrors = Partial<Record<keyof AlumniFormInput, string>>;

const QUALIFICATION_OPTIONS: AlumniQualificationLevel[] = ["UG", "PG"];

interface AlumniFormProps {
  initialValues?: AlumniFormInput;
  submitLabel?: string;
  isSubmitting?: boolean;
  onSubmit: (values: AlumniFormInput) => Promise<void>;
  onCancel?: () => void;
}

function validate(values: AlumniFormInput): FormErrors {
  const errors: FormErrors = {};
  const currentYear = new Date().getFullYear();
  const passoutYear = Number(values.passout_year);

  if (!values.full_name.trim()) errors.full_name = "Name is required";
  if (!/^\d{10}$/.test(values.phone.trim())) errors.phone = "Phone must be 10 digits";
  if (!values.address.trim()) errors.address = "Address is required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = "Valid email is required";
  if (!Number.isFinite(passoutYear) || passoutYear < 1990 || passoutYear > currentYear + 1) {
    errors.passout_year = "Passout year is invalid";
  }
  if (!values.current_position.trim()) errors.current_position = "Current position is required";
  if (!values.last_studied_institute.trim()) errors.last_studied_institute = "Institute is required";
  if (!values.qualification_level) errors.qualification_level = "Qualification is required";

  return errors;
}

function getInitialState(initialValues?: AlumniFormInput): AlumniFormInput {
  return {
    full_name: initialValues?.full_name ?? "",
    phone: initialValues?.phone ?? "",
    address: initialValues?.address ?? "",
    email: initialValues?.email ?? "",
    passout_year: initialValues?.passout_year ?? String(new Date().getFullYear()),
    current_position: initialValues?.current_position ?? "",
    last_studied_institute: initialValues?.last_studied_institute ?? "",
    qualification_level: initialValues?.qualification_level ?? "UG",
    special_skills_remark: initialValues?.special_skills_remark ?? "",
  };
}

export function AlumniForm({
  initialValues,
  submitLabel = "Save Alumni",
  isSubmitting,
  onSubmit,
  onCancel,
}: AlumniFormProps) {
  const [values, setValues] = useState<AlumniFormInput>(getInitialState(initialValues));
  const [errors, setErrors] = useState<FormErrors>({});

  const isEditMode = useMemo(() => Boolean(initialValues), [initialValues]);

  const handleChange = (field: keyof AlumniFormInput, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleReset = () => {
    setValues(getInitialState(initialValues));
    setErrors({});
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      await onSubmit({
        ...values,
        full_name: values.full_name.trim(),
        phone: values.phone.trim(),
        address: values.address.trim(),
        email: values.email.trim().toLowerCase(),
        passout_year: values.passout_year.trim(),
        current_position: values.current_position.trim(),
        last_studied_institute: values.last_studied_institute.trim(),
        special_skills_remark: values.special_skills_remark?.trim(),
      });

      if (!isEditMode) {
        handleReset();
      }
    } catch {
      // Mutation-level error feedback is handled by page-level toast handlers.
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Name"
          value={values.full_name}
          onChange={(e) => handleChange("full_name", e.target.value)}
          error={errors.full_name}
          placeholder="Full name"
        />
        <Input
          label="Phone"
          value={values.phone}
          onChange={(e) => handleChange("phone", e.target.value)}
          error={errors.phone}
          placeholder="9876543210"
          maxLength={10}
        />
        <Input
          label="Email"
          type="email"
          value={values.email}
          onChange={(e) => handleChange("email", e.target.value)}
          error={errors.email}
          placeholder="name@example.com"
        />
        <Input
          label="Passout Year"
          value={values.passout_year}
          onChange={(e) => handleChange("passout_year", e.target.value)}
          error={errors.passout_year}
          placeholder="2024"
          maxLength={4}
        />
        <Input
          label="Current Position"
          value={values.current_position}
          onChange={(e) => handleChange("current_position", e.target.value)}
          error={errors.current_position}
          placeholder="Software Engineer"
        />
        <Input
          label="Last Studied Institute"
          value={values.last_studied_institute}
          onChange={(e) => handleChange("last_studied_institute", e.target.value)}
          error={errors.last_studied_institute}
          placeholder="Institute name"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-text-secondary">Address</label>
        <textarea
          value={values.address}
          onChange={(e) => handleChange("address", e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-[10px] border border-border-input bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          placeholder="Full address"
        />
        {errors.address && <p className="text-xs text-error font-medium mt-1">{errors.address}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-secondary">Qualification</label>
          <select
            value={values.qualification_level}
            onChange={(e) => handleChange("qualification_level", e.target.value)}
            className="h-10 rounded-[10px] border border-border-input bg-surface px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            {QUALIFICATION_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {errors.qualification_level && <p className="text-xs text-error font-medium">{errors.qualification_level}</p>}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-text-secondary">Remark for Special Skills</label>
        <textarea
          value={values.special_skills_remark}
          onChange={(e) => handleChange("special_skills_remark", e.target.value)}
          rows={4}
          className="mt-1 w-full rounded-[10px] border border-border-input bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          placeholder="Add strengths, certifications, leadership notes, technical skills, etc."
        />
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" variant="primary" loading={isSubmitting}>
          {submitLabel}
        </Button>
        <Button type="button" variant="outline" onClick={handleReset} disabled={isSubmitting}>
          Reset
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
