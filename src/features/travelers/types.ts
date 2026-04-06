export type TravelerRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  active: boolean;
  created_at: string;
  country?: string | null;
  language?: string | null;
};

export type TravelerExistingMatch = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  agency_links: number;
};

export type TravelerAgencyHistoryRow = {
  id: string;
  agency_id: string;
  agency_name: string | null;
  status: string | null;
  priority: string | null;
  segment: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type AgencyTravelerRow = {
  id: string;
  agency_id: string;
  traveler_id: string;
  phone: string | null;
  notes: string | null;
  status: string | null;
  priority: string | null;
  segment: string | null;
  traveler: Pick<TravelerRow, "id" | "full_name" | "email"> | null;
};

export type TravelerLinkCountMap = Record<string, number>;

export type TravelerSavePayload = {
  id?: string;
  full_name: string;
  email: string;
  phone: string | null;
};
