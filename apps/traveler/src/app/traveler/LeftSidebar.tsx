"use client";

import React, { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Archive,
  Building2,
  Clock3,
  FileText,
  Heart,
  Home,
  LogIn,
  LogOut,
  MessageSquarePlus,
  Pin,
  Settings,
  Ticket,
  Trash2,
  Undo2,
  User,
  UserCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTravelerWorkspace } from "./TravelerWorkspaceContext";

interface UserType {
  id: string;
  name: string;
  email: string;
}

type Theme = {
  primary: string;
  secondary: string;
  accent: string;
};

type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  meta?: string | null;
};

const MODE_LABEL: Record<"chat" | "planning", string> = {
  chat: "CHAT",
  planning: "PLAN",
};

export default function LeftSidebar({
  user,
  onLoginRequest,
  onLogoutRequest,
  brandName,
  theme,
}: {
  user: UserType | null;
  onLoginRequest: () => void;
  onLogoutRequest: () => Promise<void>;
  brandName: string;
  theme: Theme;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showArchivedHistory, setShowArchivedHistory] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const {
    chatMessages,
    planningState,
    journeyState,
    journeyHistory,
    activateJourneyEntry,
    togglePinJourneyEntry,
    archiveJourneyEntry,
    restoreJourneyEntry,
    deleteJourneyEntry,
  } = useTravelerWorkspace();

  const activeHistory = journeyHistory.filter((entry) => !entry.archived);
  const pinnedHistory = activeHistory.filter((entry) => entry.pinned).slice(0, 4);
  const recentHistory = activeHistory.filter((entry) => !entry.pinned).slice(0, 4);
  const archivedHistory = journeyHistory.filter((entry) => entry.archived).slice(0, 8);

  const workspaceNav: NavItem[] = [
    { id: "hub", label: "Hub traveler", href: "/traveler", icon: <Home className="h-4 w-4" /> },
    {
      id: "chat",
      label: "Chat IA",
      href: "/traveler/chat",
      icon: <MessageSquarePlus className="h-4 w-4" />,
      meta: chatMessages.length > 0 ? String(chatMessages.length) : null,
    },
    {
      id: "planning",
      label: "Planning",
      href: "/traveler/planning",
      icon: <FileText className="h-4 w-4" />,
      meta: planningState.dirty ? "Borrador" : null,
    },
    {
      id: "bookings",
      label: "Reservas",
      href: "/traveler/bookings",
      icon: <Ticket className="h-4 w-4" />,
      meta: journeyState.reservation?.status ? journeyState.reservation.status : null,
    },
  ];

  const accountNav: NavItem[] = [
    { id: "profile", label: "Perfil viajero", href: "/traveler/profile", icon: <User className="h-4 w-4" /> },
    { id: "preferences", label: "Preferencias", href: "/traveler/preferences", icon: <Settings className="h-4 w-4" /> },
    { id: "favorites", label: "Favoritos", href: "/traveler/favorites", icon: <Heart className="h-4 w-4" /> },
  ];

  function handleRoutePush(href: string) {
    router.push(href);
  }

  function isActiveRoute(href: string) {
    if (href === "/traveler") return pathname === "/traveler";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function handleOpenHistoryEntry(entryId: string) {
    const journeyEntry = journeyHistory.find((item) => item.id === entryId);
    activateJourneyEntry(entryId);
    router.push(journeyEntry?.route || "/traveler");
  }

  function formatUpdatedAt(timestamp: number) {
    return new Date(timestamp).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
    });
  }

  function renderNavGroup(title: string, items: NavItem[]) {
    if (!isExpanded) {
      return (
        <div className="space-y-1">
          {items.map((item) => {
            const isActive = isActiveRoute(item.href);
            return (
              <button
                key={item.id}
                type="button"
                title={item.label}
                onClick={() => handleRoutePush(item.href)}
                className={`flex w-full items-center justify-center rounded-lg px-2 py-2 transition ${
                  isActive
                    ? "bg-white/80 text-slate-900"
                    : "text-slate-700 hover:bg-white/50"
                }`}
              >
                {item.icon}
              </button>
            );
          })}
        </div>
      );
    }

    return (
      <div className="space-y-2 rounded-xl border border-white/30 bg-white/35 p-2 backdrop-blur-sm">
        <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
          {title}
        </p>
        {items.map((item) => {
          const isActive = isActiveRoute(item.href);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleRoutePush(item.href)}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition ${
                isActive
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-700 hover:bg-white/60"
              }`}
            >
              <span className="inline-flex items-center gap-2 text-sm font-medium">
                {item.icon}
                {item.label}
              </span>
              {item.meta ? (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    isActive
                      ? "bg-slate-100 text-slate-700"
                      : "bg-white text-slate-600"
                  }`}
                >
                  {item.meta}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    );
  }

  function renderHistoryRow(
    entry: (typeof journeyHistory)[number],
    archivedView = false,
  ) {
    const modeLabel = MODE_LABEL[entry.mode];
    return (
      <div
        key={entry.id}
        className="rounded-lg border border-white/30 bg-white/40 p-2 text-left backdrop-blur-sm"
      >
        <button
          type="button"
          onClick={() => handleOpenHistoryEntry(entry.id)}
          className="w-full text-left"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            {modeLabel} {entry.pinned ? ". Fijo" : ""}
          </p>
          <p className="mt-1 line-clamp-1 text-xs font-medium text-slate-800">
            {entry.title}
          </p>
          <p className="mt-1 text-[10px] text-slate-500">
            {formatUpdatedAt(entry.updatedAt)}
          </p>
        </button>
        <div className="mt-2 flex items-center gap-1">
          {archivedView ? (
            <button
              type="button"
              onClick={() => restoreJourneyEntry(entry.id)}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
              title="Restaurar"
            >
              <Undo2 className="h-3 w-3" />
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => togglePinJourneyEntry(entry.id)}
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
                title={entry.pinned ? "Quitar fijo" : "Fijar"}
              >
                <Pin className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => archiveJourneyEntry(entry.id)}
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
                title="Archivar"
              >
                <Archive className="h-3 w-3" />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => deleteJourneyEntry(entry.id)}
            className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-semibold text-rose-700 hover:bg-rose-100"
            title="Eliminar"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.aside
      onMouseLeave={() => setIsExpanded(false)}
      animate={{ width: isExpanded ? 300 : 78 }}
      transition={{ duration: 0.25 }}
      className={`pointer-events-auto z-10 flex flex-shrink-0 flex-col overflow-hidden transition-all ${
        isExpanded
          ? "h-full border-r shadow-md backdrop-blur-lg"
          : "h-auto border-0 bg-transparent shadow-none"
      }`}
      style={
        isExpanded
          ? {
              background: `linear-gradient(180deg, ${theme.primary}22 0%, ${theme.accent}14 100%)`,
              borderColor: `${theme.primary}33`,
            }
          : {
              background: "transparent",
              borderColor: "transparent",
            }
      }
    >
      <div
        className={`${isExpanded ? "border-b px-3 py-3" : "px-3 py-3"}`}
        style={{ borderColor: `${theme.primary}33` }}
      >
        <div
          onMouseEnter={() => setIsExpanded(true)}
          className={`overflow-hidden rounded-2xl border text-slate-900 shadow-sm transition-all ${
            isExpanded ? "px-3 py-3" : "flex h-12 w-12 items-center justify-center p-0"
          }`}
          style={{
            borderColor: `${theme.primary}40`,
            background: `linear-gradient(145deg, ${theme.primary}18 0%, #ffffff 75%)`,
          }}
        >
          <div className={`flex items-center ${isExpanded ? "gap-3" : "justify-center"}`}>
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
              style={{ backgroundColor: theme.primary }}
            >
              <Building2 className="h-5 w-5" />
            </div>
            <AnimatePresence>
              {isExpanded ? (
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Experiencia traveler
                  </p>
                  <p className="max-w-[180px] truncate text-sm font-semibold">
                    {brandName}
                  </p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {isExpanded ? (
        <>
          <nav className="flex-1 space-y-2 overflow-y-auto px-2 pt-4">
            {renderNavGroup("Workspace", workspaceNav)}

            <div className="space-y-2 rounded-xl border border-white/30 bg-white/35 p-2 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <p className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                  <Clock3 className="h-3.5 w-3.5" />
                  Historial
                </p>
                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                  {activeHistory.length}
                </span>
              </div>

              <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                {pinnedHistory.length > 0 ? (
                  <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Fijados
                  </p>
                ) : null}
                {pinnedHistory.map((entry) => renderHistoryRow(entry))}

                {recentHistory.length > 0 ? (
                  <p className="px-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Recientes
                  </p>
                ) : null}
                {recentHistory.map((entry) => renderHistoryRow(entry))}

                {pinnedHistory.length === 0 && recentHistory.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-300 bg-white/60 px-2 py-3 text-center text-[11px] text-slate-500">
                    Sin conversaciones guardadas.
                  </p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => setShowArchivedHistory((current) => !current)}
                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                {showArchivedHistory
                  ? "Ocultar archivados"
                  : `Ver archivados (${archivedHistory.length})`}
              </button>

              {showArchivedHistory ? (
                <div className="max-h-40 space-y-2 overflow-y-auto pr-1">
                  {archivedHistory.length > 0 ? (
                    archivedHistory.map((entry) => renderHistoryRow(entry, true))
                  ) : (
                    <p className="rounded-lg border border-dashed border-slate-300 bg-white/60 px-2 py-3 text-center text-[11px] text-slate-500">
                      No hay items archivados.
                    </p>
                  )}
                </div>
              ) : null}
            </div>

            {renderNavGroup("Cuenta", accountNav)}
          </nav>

          <footer className="flex-shrink-0 border-t p-2" style={{ borderColor: `${theme.primary}33` }}>
            <div className="space-y-2 rounded-xl border border-white/30 bg-white/35 p-2 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white">
                  <UserCircle className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {user?.name || "Invitado"}
                  </p>
                  <p className="truncate text-[11px] text-slate-500">
                    {user?.email || "Sin sesion"}
                  </p>
                </div>
              </div>
              {user ? (
                <button
                  type="button"
                  onClick={() => void onLogoutRequest()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Cerrar sesion
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onLoginRequest}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  Iniciar sesion
                </button>
              )}
            </div>
          </footer>
        </>
      ) : null}
    </motion.aside>
  );
}
