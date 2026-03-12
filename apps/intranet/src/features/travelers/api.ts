import { supabaseBrowser as supabase } from "@/lib/supabase/client";
import type { AgencyTravelerRow, TravelerLinkCountMap, TravelerRow, TravelerSavePayload } from "./types";

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
  const travelerId = await saveTraveler(payload);

  const { error } = await supabase.from("agency_travelers").insert({
    traveler_id: travelerId,
    agency_id: agencyId,
    status: "active",
    priority: "normal",
    full_name: payload.full_name,
    email: payload.email,
    phone: payload.phone,
  });

  if (error) throw error;
  return travelerId;
}
