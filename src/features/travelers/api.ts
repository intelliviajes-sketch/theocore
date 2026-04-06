import { supabaseBrowser as supabase } from "@/lib/supabase/client";
import type {
  AgencyTravelerRow,
  TravelerAgencyHistoryRow,
  TravelerExistingMatch,
  TravelerLinkCountMap,
  TravelerRow,
  TravelerSavePayload,
} from "./types";

type TravelerLinkRow = {
  traveler_id: string;
  status: string | null;
};

type AgencyTravelerSelectRow = {
  id: string;
  agency_id: string;
  traveler_id: string;
  phone: string | null;
  notes: string | null;
  status: string | null;
  priority: string | null;
  segment: string | null;
  traveler: { id: string; full_name: string; email: string } | { id: string; full_name: string; email: string }[] | null;
};

type TravelerHistorySelectRow = {
  id: string;
  agency_id: string;
  status: string | null;
  priority: string | null;
  segment: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  agency: { commercial_name: string | null } | { commercial_name: string | null }[] | null;
};

function normalizeAgencyTraveler(row: AgencyTravelerSelectRow): AgencyTravelerRow {
  const traveler = Array.isArray(row.traveler) ? row.traveler[0] ?? null : row.traveler;
  return {
    id: row.id,
    agency_id: row.agency_id,
    traveler_id: row.traveler_id,
    phone: row.phone,
    notes: row.notes,
    status: row.status,
    priority: row.priority,
    segment: row.segment,
    traveler,
  };
}

export async function listTravelers() {
  const { data, error } = await supabase
    .from("travelers")
    .select("id, full_name, email, phone, active, created_at, country, language")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as TravelerRow[]) || [];
}

export async function getTravelerLinkCountMap() {
  const { data, error } = await supabase.from("agency_travelers").select("traveler_id, status");
  if (error) throw error;

  const nextLinkCount: TravelerLinkCountMap = {};
  for (const link of (data as TravelerLinkRow[]) || []) {
    if (!link.traveler_id) continue;
    nextLinkCount[link.traveler_id] = (nextLinkCount[link.traveler_id] || 0) + 1;
  }

  return nextLinkCount;
}

export async function saveTraveler(payload: TravelerSavePayload) {
  const normalized = {
    full_name: payload.full_name,
    email: payload.email,
    phone: payload.phone,
  };

  if (payload.id) {
    const { error } = await supabase.from("travelers").update(normalized).eq("id", payload.id);
    if (error) throw error;
    return payload.id;
  }

  const { data, error } = await supabase
    .from("travelers")
    .insert({ ...normalized, active: true })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function setTravelerActive(travelerId: string, active: boolean) {
  const { error } = await supabase.from("travelers").update({ active }).eq("id", travelerId);
  if (error) throw error;
}

export async function archiveTraveler(travelerId: string) {
  await setTravelerActive(travelerId, false);
}

export async function listAgencyTravelers(agencyId: string) {
  const { data, error } = await supabase
    .from("agency_travelers")
    .select(
      `
        id,
        agency_id,
        traveler_id,
        phone,
        notes,
        status,
        priority,
        segment,
        traveler:travelers (
          id,
          full_name,
          email
        )
      `,
    )
    .eq("agency_id", agencyId)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return ((data as AgencyTravelerSelectRow[]) || []).map(normalizeAgencyTraveler);
}

export async function createTravelerForAgency(agencyId: string, payload: TravelerSavePayload) {
  const { data, error } = await supabase.rpc("upsert_traveler_and_link", {
    p_agency_id: agencyId,
    p_full_name: payload.full_name,
    p_email: payload.email,
    p_phone: payload.phone,
    p_notes: null,
    p_segment: null,
    p_priority: "normal",
  });

  if (error) throw error;
  return String(data);
}

export async function findTravelerMatchByEmail(email: string): Promise<TravelerExistingMatch | null> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return null;

  const { data: traveler, error: travelerError } = await supabase
    .from("travelers")
    .select("id, full_name, email, phone")
    .ilike("email", normalizedEmail)
    .maybeSingle();

  if (travelerError) throw travelerError;
  if (!traveler) return null;

  const { count, error: linksError } = await supabase
    .from("agency_travelers")
    .select("id", { count: "exact", head: true })
    .eq("traveler_id", traveler.id);

  if (linksError) throw linksError;

  return {
    id: String(traveler.id),
    full_name: String(traveler.full_name || ""),
    email: String(traveler.email || normalizedEmail),
    phone: traveler.phone ? String(traveler.phone) : null,
    agency_links: count || 0,
  };
}

export async function listTravelerAgencyHistory(travelerId: string): Promise<TravelerAgencyHistoryRow[]> {
  if (!travelerId) return [];

  const { data, error } = await supabase
    .from("agency_travelers")
    .select(
      `
        id,
        agency_id,
        status,
        priority,
        segment,
        notes,
        created_at,
        updated_at,
        agency:agencies (
          commercial_name
        )
      `,
    )
    .eq("traveler_id", travelerId)
    .order("updated_at", { ascending: false });

  if (error) throw error;

  return ((data as TravelerHistorySelectRow[]) || []).map((row) => {
    const agency = Array.isArray(row.agency) ? row.agency[0] ?? null : row.agency;
    return {
      id: row.id,
      agency_id: row.agency_id,
      agency_name: agency?.commercial_name || null,
      status: row.status,
      priority: row.priority,
      segment: row.segment,
      notes: row.notes,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  });
}
