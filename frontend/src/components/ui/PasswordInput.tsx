import { useState, type InputHTMLAttributes } from "react";
import { useTranslation } from "react-i18next";
import { fieldBase, FieldWrap } from "./Input";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: string;
  error?: string;
  hint?: string;
};

export function PasswordInput({ label, error, hint, className = "", ...rest }: PasswordInputProps) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  return (
    <FieldWrap label={label} error={error} hint={hint}>
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          className={fieldBase + " pe-11 " + (error ? "border-error " : "") + className}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? t("common.hidePassword") : t("common.showPassword")}
          className="absolute inset-y-0 end-0 flex items-center px-3 text-ink-faint hover:text-ink"
        >
          {visible ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M1 10s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="10" cy="10" r="2.5" />
              <line x1="2" y1="18" x2="18" y2="2" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M1 10s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="10" cy="10" r="2.5" />
            </svg>
          )}
        </button>
      </div>
    </FieldWrap>
  );
}
