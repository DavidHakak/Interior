import type React from "react";

export type tableField = {
  name: string;
  label: string;
  editLable?: string;
  render?: () => React.ReactNode;
  data?: unknown;
  required?: boolean;
  className?: string;
};
