"use client";

import type { ReactNode } from "react";

export default function TravelerWorkspaceLayout({
  topBar,
  left,
  right,
}: {
  topBar?: ReactNode;
  left: ReactNode;
  right: ReactNode;
}) {
  return (
    <div className="trav-page bg-[#fffaf7]">
      <div className="trav-container">
        {topBar ? <div className="mb-3">{topBar}</div> : null}

        <div className="trav-grid">
          <section className="trav-reveal min-w-0">{left}</section>
          <aside className="trav-reveal hidden xl:block">{right}</aside>
        </div>
      </div>
    </div>
  );
}
