import { Upload } from "lucide-react";
import { useRef } from "react";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { useFieldContext } from "./form-context";

type FormImageProps = {
    label: string;
    disabled?: boolean;
    accept?: string;
    // Server accepts up to ~1.5MB base64; the in-memory File limit is
    // the same after the +33% base64 expansion.
    maxBytes?: number;
};

// Validate a File: must match the accepted MIME types and be under the
// size limit. We re-validate here even though the file is also sent to
// the server, because freezing the tab on a multi-GB upload is a real
// risk if the user picks the wrong file.
function validateFile(
    file: File,
    accept: string,
    maxBytes: number,
): string | null {
    if (file.size > maxBytes) {
        const sizeMb = (maxBytes / (1024 * 1024)).toFixed(1);
        return `File is too large; max ${sizeMb}MB.`;
    }

    const allowed = accept
        .split(",")
        .map((m) => m.trim())
        .filter(Boolean);
    if (allowed.length > 0 && !allowed.includes(file.type)) {
        return `Unsupported file type. Allowed: ${allowed.join(", ")}`;
    }
    return null;
}

export function FormImage({
    label,
    disabled,
    accept = "image/png,image/jpeg,image/jpg,image/webp",
    maxBytes = 5 * 1024 * 1024,
}: FormImageProps) {
    const field = useFieldContext<File | null>();
    const inputRef = useRef<HTMLInputElement>(null);

    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        if (!file) {
            field.handleChange(null);
            return;
        }

        const error = validateFile(file, accept, maxBytes);
        if (error) {
            // Reset the underlying input so the same file can be
            // re-selected after the user fixes the problem.
            e.target.value = "";
            field.handleChange(null);
            field.setMeta((prev) => ({ ...prev, errors: [error] }));
            return;
        }

        field.handleChange(file);
    };

    return (
        <Field data-invalid={isInvalid}>
            <FieldLabel htmlFor={field.name}>{label}</FieldLabel>

            <input
                ref={inputRef}
                id={field.name}
                name={field.name}
                type="file"
                accept={accept}
                disabled={disabled}
                onBlur={field.handleBlur}
                onChange={handleFileChange}
                aria-invalid={isInvalid}
                className="sr-only"
            />

            <button
                type="button"
                disabled={disabled}
                onClick={() => inputRef.current?.click()}
                className="flex w-full flex-col items-center justify-center rounded-md border border-dashed px-6 py-8 text-center disabled:cursor-not-allowed disabled:opacity-60"
            >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-200">
                    <Upload className="h-5 w-5 text-gray-700" />
                </div>

                <p className="text-sm font-medium text-gray-900">Click to upload image</p>
                <p className="mt-1 text-xs text-gray-500">
                    PNG, JPG or WEBP (max. {(maxBytes / (1024 * 1024)).toFixed(1)}MB)
                </p>
            </button>

            {field.state.value && <p className="mt-2 text-sm text-gray-600">Selected: {field.state.value.name}</p>}

            {isInvalid && <FieldError errors={field.state.meta.errors} />}
        </Field>
    );
}
