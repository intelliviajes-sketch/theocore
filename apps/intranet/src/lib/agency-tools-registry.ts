export type AgencyToolStatus = "live" | "redesign" | "planned";

export type AgencyToolRegistryItem = {
  toolKey: string;
  label: string;
  icon?: string | null;
  path: string;
  status: AgencyToolStatus;
  summary: string;
};

export const AGENCY_TOOL_REGISTRY: AgencyToolRegistryItem[] = [
  {
    toolKey: "catalog",
    label: "Catalogo manual",
    icon: "PackageSearch",
    path: "/intranet/agency/{id}/ag_tools/catalog",
    status: "live",
    summary: "CRUD manual del catalogo de productos de la agencia.",
  },
  {
    toolKey: "catalogia",
    label: "Catalogo x IA",
    icon: "Sparkles",
    path: "/intranet/agency/{id}/ag_tools/catalogia",
    status: "redesign",
    summary: "Modulo en rediseno. No se expone como herramienta operativa hasta cerrar la nueva version.",
  },
  {
    toolKey: "ag_booking",
    label: "Bookings",
    icon: "CalendarCheck2",
    path: "/intranet/agency/{id}/ag_tools/ag_booking",
    status: "planned",
    summary: "Reservas y seguimiento comercial pendientes de implementar.",
  },
  {
    toolKey: "ag_suport",
    label: "Soporte",
    icon: "LifeBuoy",
    path: "/intranet/agency/{id}/ag_tools/ag_suport",
    status: "planned",
    summary: "Modulo previsto para incidencias y soporte operativo.",
  },
  {
    toolKey: "ag_travelers",
    label: "Travelers tools",
    icon: "UserRoundCog",
    path: "/intranet/agency/{id}/ag_tools/ag_travelers",
    status: "planned",
    summary: "Herramientas complementarias para relacion con viajeros, aun no activas.",
  },
  {
    toolKey: "marketing",
    label: "Marketing",
    icon: "Megaphone",
    path: "/intranet/agency/{id}/ag_tools/marketing",
    status: "planned",
    summary: "Automaciones de marketing pendientes de desarrollo.",
  },
  {
    toolKey: "socialmedia",
    label: "Social media",
    icon: "Share2",
    path: "/intranet/agency/{id}/ag_tools/socialmedia",
    status: "planned",
    summary: "Herramientas de social media aun no implementadas.",
  },
];

export const ACTIVE_AGENCY_TOOL_KEYS = new Set(
  AGENCY_TOOL_REGISTRY.filter((tool) => tool.status === "live").map((tool) => tool.toolKey),
);

export const NON_LIVE_AGENCY_TOOLS = AGENCY_TOOL_REGISTRY.filter((tool) => tool.status !== "live");
