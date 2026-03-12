import type { ReactNode } from "react";

export default function IntranetLayout({ children }: { children: ReactNode }) {
  return <div className="intranet-wrapper">{children}</div>;
}
