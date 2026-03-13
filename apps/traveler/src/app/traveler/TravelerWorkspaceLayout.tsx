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
    <div className="trav-page bg-[radial-gradient(900px_360px_at_90%_-5%,rgba(251,191,36,0.16),transparent_60%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]">
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
