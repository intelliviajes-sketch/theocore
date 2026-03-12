export const INTRANET_HOME = "/intranet";
export const THEOCORE_HOME = "/intranet/thecore";
export const THEOCORE_SETTINGS_HOME = `${THEOCORE_HOME}/setting`;
export const TRAVELER_HOME = "/traveler";

export function theocorePath(path = "") {
  return path ? `${THEOCORE_HOME}/${path}` : THEOCORE_HOME;
}

export function theocoreSettingPath(path = "") {
  return path ? `${THEOCORE_SETTINGS_HOME}/${path}` : THEOCORE_SETTINGS_HOME;
}

export function agencyHomePath(agencyId: string) {
  return `/intranet/agency/${agencyId}`;
}

export function agencySectionPath(agencyId: string, section = "") {
  return section ? `${agencyHomePath(agencyId)}/${section}` : agencyHomePath(agencyId);
}
