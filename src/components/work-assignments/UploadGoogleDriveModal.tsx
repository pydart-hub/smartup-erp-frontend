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
  onSuccess?: () => void;
}

export const UploadGoogleDriveModal: React.FC<UploadGoogleDriveModalProps> = ({
  isOpen,
  onClose,
  workAssignmentId,
  deadline,
  onSuccess,
}) => {
  const { instructorName } = useAuth();
  const [link, setLink] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const isValidLink = link.trim().length > 0 && validateGoogleDriveUrl(link.trim());

  const handleLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLink(value);
    
    // Real-time validation
    if (value.trim().length > 0) {
      if (validateGoogleDriveUrl(value.trim())) {
        setValidationError(null);
      } else {
        setValidationError("Invalid Google Drive URL. Must be https://drive.google.com/...");
      }
    } else {
      setValidationError(null);
    }
  };

  const handleSubmit = async () => {
    if (!isValidLink) {
      setValidationError("Please enter a valid Google Drive link");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitInstructorWork({
        work_assignment_id: workAssignmentId,
        instructor_id: instructorName || "",
        google_drive_link: link.trim(),
      });

      if (result.status === "success") {
        toast.success("Work submitted successfully! ✅");
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
            Paste your Google Drive link below to submit your work.
          </p>
        </div>

        <div className="space-y-4">
          {/* Deadline Display */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-700">
              <span className="font-medium">Deadline:</span> {new Date(deadline).toLocaleDateString()}
            </p>
          </div>

          {/* Google Drive Link Input */}
          <div>
            <label htmlFor="drive-link" className="text-sm font-medium text-text-secondary">
              Google Drive Link *
            </label>
            <Input
              id="drive-link"
              placeholder="https://drive.google.com/file/d/..."
              value={link}
              onChange={handleLinkChange}
              className="mt-2"
              disabled={isSubmitting}
            />
            {link.trim().length > 0 && (
              <div className={`mt-2 flex items-center gap-2 text-sm ${isValidLink ? "text-green-600" : "text-red-600"}`}>
                {isValidLink ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Valid Google Drive link
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4" />
                    Invalid link format
                  </>
                )}
              </div>
            )}
            {validationError && (
              <p className="mt-2 text-xs text-red-600">{validationError}</p>
            )}
          </div>

          {/* Description Input */}
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

          {/* Instructions */}
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-600">
            <p className="font-medium mb-1">💡 Tips:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Make sure the file is shared with view access</li>
              <li>Use the publicly shared link from Google Drive</li>
              <li>Check that the deadline hasn't passed</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
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
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isSubmitting ? "Submitting..." : "Submit Work"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
