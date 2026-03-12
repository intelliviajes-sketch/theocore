export type FieldErrors = Record<string, string>;

function hasValue(value: string | null | undefined) {
  return Boolean(value && value.trim().length > 0);
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isPhone(value: string) {
  const normalized = value.replace(/[^\d+]/g, "");
  return normalized.length >= 7;
}

export function validateAgencyForm(input: {
  commercialName: string;
  legalName: string;
  countryCode: string;
  emailContact: string;
  emailEmergency?: string;
  whatsapp?: string;
  bankInformation?: string;
}) {
  const errors: FieldErrors = {};

  if (!hasValue(input.commercialName)) errors.commercialName = "El nombre comercial es obligatorio.";
  if (!hasValue(input.legalName)) errors.legalName = "La razon social es obligatoria.";
  if (!hasValue(input.countryCode)) errors.countryCode = "Debes seleccionar un pais.";
  if (!hasValue(input.emailContact)) errors.emailContact = "El correo de contacto es obligatorio.";
  else if (!isEmail(input.emailContact)) errors.emailContact = "El correo de contacto no es valido.";

  if (hasValue(input.emailEmergency || "") && !isEmail(input.emailEmergency || "")) {
    errors.emailEmergency = "El correo de emergencia no es valido.";
  }

  if (hasValue(input.whatsapp || "") && !isPhone(input.whatsapp || "")) {
    errors.whatsapp = "El telefono debe tener al menos 7 digitos.";
  }

  if (hasValue(input.bankInformation || "")) {
    try {
      JSON.parse(input.bankInformation || "{}");
    } catch {
      errors.bankInformation = "La informacion bancaria debe ser un JSON valido.";
    }
  }

  return errors;
}

export function validateTravelerForm(input: {
  fullName: string;
  email: string;
  phone?: string;
}) {
  const errors: FieldErrors = {};

  if (!hasValue(input.fullName)) errors.fullName = "El nombre completo es obligatorio.";
  if (!hasValue(input.email)) errors.email = "El correo es obligatorio.";
  else if (!isEmail(input.email)) errors.email = "El correo no es valido.";

  if (hasValue(input.phone || "") && !isPhone(input.phone || "")) {
    errors.phone = "El telefono debe tener al menos 7 digitos.";
  }

  return errors;
}

export function validateUserForm(input: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: "AgencyOwner" | "TeamAgency";
  mode: "global" | "agency";
  selectedAgency?: string;
  selectedAgencies?: string[];
  currentAgencyId?: string;
}) {
  const errors: FieldErrors = {};

  if (!hasValue(input.firstName)) errors.firstName = "El nombre es obligatorio.";
  if (!hasValue(input.lastName)) errors.lastName = "El apellido es obligatorio.";
  if (!hasValue(input.email)) errors.email = "El correo es obligatorio.";
  else if (!isEmail(input.email)) errors.email = "El correo no es valido.";

  if (hasValue(input.phone || "") && !isPhone(input.phone || "")) {
    errors.phone = "El telefono debe tener al menos 7 digitos.";
  }

  if (input.mode === "global" && input.role === "AgencyOwner" && (!input.selectedAgencies || input.selectedAgencies.length === 0)) {
    errors.selectedAgencies = "Debes seleccionar al menos una agencia.";
  }

  if (input.mode === "global" && input.role === "TeamAgency" && !hasValue(input.selectedAgency || "")) {
    errors.selectedAgency = "Debes seleccionar una agencia.";
  }

  if (input.mode === "agency" && !hasValue(input.currentAgencyId || "")) {
    errors.currentAgencyId = "No se pudo resolver la agencia actual.";
  }

  return errors;
}
