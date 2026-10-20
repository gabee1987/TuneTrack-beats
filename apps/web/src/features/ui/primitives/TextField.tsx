import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { classNames } from "../classNames";
import styles from "./TextField.module.css";

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "children"> {
  /** `code`: monospace and shown in capitals, for room codes; the value keeps what was typed. */
  appearance?: "code" | "text" | undefined;
  /** Replaces the helper and is announced as soon as it appears. */
  error?: string | null | undefined;
  helper?: ReactNode | undefined;
  label: string;
  /** A control inside the field's right edge, such as a paste or clear button. */
  trailing?: ReactNode | undefined;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  {
    appearance = "text",
    "aria-describedby": describedBy,
    className,
    error,
    helper,
    id,
    label,
    trailing,
    type = "text",
    ...inputProps
  },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;
  const hasError = Boolean(error);
  const message = hasError ? error : helper;
  // A caller's own description (a reason the field is held) comes before the field's message.
  const descriptionIds = [describedBy, message ? messageId : null].filter(Boolean).join(" ");

  return (
    <div className={classNames(styles.field, className)}>
      <label className={styles.label} htmlFor={inputId}>
        {label}
      </label>
      <div className={classNames(styles.control, hasError ? styles.invalid : undefined)}>
        <input
          {...inputProps}
          aria-describedby={descriptionIds || undefined}
          aria-invalid={hasError || undefined}
          className={classNames(styles.input, appearance === "code" ? styles.code : undefined)}
          id={inputId}
          ref={ref}
          type={type}
        />
        {trailing ? <div className={styles.trailing}>{trailing}</div> : null}
      </div>
      {message ? (
        <p
          className={hasError ? styles.error : styles.helper}
          id={messageId}
          role={hasError ? "alert" : undefined}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
});
