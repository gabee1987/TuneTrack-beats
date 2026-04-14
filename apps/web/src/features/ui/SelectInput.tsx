import type { SelectHTMLAttributes } from "react";
import styles from "./FormControls.module.css";

interface SelectInputProps extends SelectHTMLAttributes<HTMLSelectElement> {
  className?: string | undefined;
}

export function SelectInput({ className, ...props }: SelectInputProps) {
  return (
    <select
      {...props}
      className={`${styles.selectInput}${className ? ` ${className}` : ""}`}
    />
  );
}
