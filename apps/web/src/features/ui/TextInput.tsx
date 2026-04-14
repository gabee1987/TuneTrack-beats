import type { InputHTMLAttributes } from "react";
import styles from "./FormControls.module.css";

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string | undefined;
}

export function TextInput({ className, ...props }: TextInputProps) {
  return (
    <input
      {...props}
      className={`${styles.textInput}${className ? ` ${className}` : ""}`}
    />
  );
}
