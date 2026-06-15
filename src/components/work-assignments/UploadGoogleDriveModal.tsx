// Upload Google Drive Modal Component
// File: src/components/work-assignments/UploadGoogleDriveModal.tsx

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { validateGoogleDriveUrl, submitInstructorWork } from "@/lib/api/workAssignment";
import { toast } from "sonner";
import { useAuth } from "@/lib/hooks/useAuth";

export interface UploadGoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  workAssignmentId: string;
  deadline: string;
  recipientType?: "Instructor" | "Branch Manager";
  recipientKey?: string;
  onSuccess?: () => void;
}

export const UploadGoogleDriveModal: React.FC<UploadGoogleDriveModalProps> = ({
  isOpen,
  onClose,
  workAssignmentId,
  deadline,
  recipientType = "Instructor",
  recipientKey,
  onSuccess,
}) => {
  const { instructorName, user } = useAuth();
  const [link, setLink] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const isValidLink = link.trim().length > 0 && validateGoogleDriveUrl(link.trim());

  const handleLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLink(value);

    if (value.trim().length > 0) {
      if (validateGoogleDriveUrl(value.trim())) {
        setValidationError(null);
      } else {
        setValidationError(
          "Invalid Google submission link. Use a shared https://drive.google.com/... or https://docs.google.com/... URL."
        );
      }
    } else {
      setValidationError(null);
    }
  };

  const handleSubmit = async () => {
    if (!isValidLink) {
      setValidationError("Please enter a valid Google submission link");
      return;
    }

    setIsSubmitting(true);
    try {
      const activeRecipientKey = recipientKey || (recipientType === "Branch Manager" ? user?.email : instructorName) || "";

      const result = await submitInstructorWork({
        work_assignment_id: workAssignmentId,
        instructor_id: activeRecipientKey,
        recipient_key: activeRecipientKey,
        recipient_type: recipientType,
        google_drive_link: link.trim(),
      });

      if (result.status === "success") {
        toast.success("Work submitted successfully!");
        setLink("");
        setDescription("");
        onClose();
        onSuccess?.();
      } else {
        toast.error(result.message || "Failed to submit work");
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Error submitting work");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-xl border border-border-light bg-surface p-5 shadow-card">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-text-primary">Submit Your Work</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Paste your shared Google Drive or Google Docs link below to submit your work.
          </p>
        </div>

        <div className="space-y-4">
          <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
            <p className="text-sm text-blue-700">
              <span className="font-medium">Deadline:</span> {new Date(deadline).toLocaleDateString()}
            </p>
          </div>

          <div>
            <label htmlFor="drive-link" className="text-sm font-medium text-text-secondary">
              Submission Link *
            </label>
            <Input
              id="drive-link"
              placeholder="https://drive.google.com/file/d/... or https://docs.google.com/..."
              value={link}
              onChange={handleLinkChange}
              className="mt-2"
              disabled={isSubmitting}
            />
            {link.trim().length > 0 && (
              <div className={`mt-2 flex items-center gap-2 text-sm ${isValidLink ? "text-green-600" : "text-red-600"}`}>
                {isValidLink ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Valid Google submission link
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4" />
                    Invalid link format
                  </>
                )}
              </div>
            )}
            {validationError && (
              <p className="mt-2 text-xs text-red-600">{validationError}</p>
            )}
          </div>

          <div>
            <label htmlFor="description" className="text-sm font-medium text-text-secondary">
              Description (Optional)
            </label>
            <Input
              id="description"
              placeholder="e.g., Assessment_Draft_v1"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-2"
              disabled={isSubmitting}
            />
            <p className="mt-1 text-xs text-gray-500">
              Help your manager identify your submission
            </p>
          </div>

          <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
            <p className="mb-1 font-medium">Tips:</p>
            <ul className="list-inside list-disc space-y-1 text-xs">
              <li>Make sure the file is shared with view access</li>
              <li>Use the shared link from Google Drive, Docs, Slides, or Sheets</li>
              <li>Check that the deadline has not passed</li>
            </ul>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!isValidLink || isSubmitting}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              {isSubmitting ? "Submitting..." : "Submit Work"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
