'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useToast } from '@/components/system/ToastProvider';
import { validateAgencyForm } from '@/lib/validation/theocore';

type Agency = {
  id: string;
  commercial_name: string;
  legal_name: string;
  country_code: string;
  address?: string;
  whatsapp?: string;
  email_contact: string;
  email_emergency?: string;
  tax_id?: string;
  bank_information?: unknown;
  active: boolean;
  created_at: string;
};

type AgencyBranding = {
  logo_url: string | null;
  hero_config: Record<string, unknown> | null;
};

type MascotBrainOption = {
  id: string;
  name: string;
  logo_url: string | null;
};

type AgencyProfileForm = {
  commercial_name: string;
  legal_name: string;
  country_code: string;
  address?: string;
  whatsapp?: string;
  email_contact: string;
  email_emergency?: string;
  tax_id?: string;
  bank_information?: string;
  active: string;
  logo_url?: string;
  mascot_brain_id?: string;
  mascot_name?: string;
};

function inputClass(hasError?: boolean) {
  return `input ${hasError ? 'border-rose-400 bg-rose-50 text-rose-900 focus:border-rose-500' : ''}`.trim();
}

function asJsonObject(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function readHeroString(value: unknown, key: string) {
  const record = asJsonObject(value);
  const raw = record[key];
  return typeof raw === 'string' ? raw.trim() : '';
}

export default function AgencyProfile({
  agency,
  branding,
  mascotBrainOptions,
}: {
  agency: Agency;
  branding: AgencyBranding | null;
  mascotBrainOptions: MascotBrainOption[];
}) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    watch,
    formState: { errors },
  } = useForm<AgencyProfileForm>();
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const { success, error } = useToast();

  const currentHeroConfig = useMemo(() => asJsonObject(branding?.hero_config), [branding?.hero_config]);
  const mascotBrainId = watch('mascot_brain_id') || '';
  const selectedMascotBrain = useMemo(
    () => mascotBrainOptions.find((brain) => brain.id === mascotBrainId) || null,
    [mascotBrainId, mascotBrainOptions],
  );

  useEffect(() => {
    if (agency) {
      reset({
        commercial_name: agency.commercial_name,
        legal_name: agency.legal_name,
        country_code: agency.country_code,
        address: agency.address || '',
        whatsapp: agency.whatsapp || '',
        email_contact: agency.email_contact,
        email_emergency: agency.email_emergency || '',
        tax_id: agency.tax_id || '',
        active: agency.active ? 'true' : 'false',
        bank_information: agency.bank_information
          ? JSON.stringify(agency.bank_information, null, 2)
          : '',
        logo_url: branding?.logo_url || '',
        mascot_brain_id: readHeroString(branding?.hero_config, 'mascot_brain_id'),
        mascot_name: readHeroString(branding?.hero_config, 'mascot_name'),
      });
    }
  }, [agency, branding, reset]);

  const createdAtLabel = useMemo(() => new Date(agency.created_at).toLocaleString(), [agency.created_at]);

  const onSubmit = async (data: AgencyProfileForm) => {
    clearErrors();

    const validation = validateAgencyForm({
      commercialName: data.commercial_name,
      legalName: data.legal_name,
      countryCode: data.country_code,
      emailContact: data.email_contact,
      emailEmergency: data.email_emergency,
      whatsapp: data.whatsapp,
      bankInformation: data.bank_information,
    });

    if (Object.keys(validation).length > 0) {
      if (validation.commercialName) setError('commercial_name', { type: 'manual', message: validation.commercialName });
      if (validation.legalName) setError('legal_name', { type: 'manual', message: validation.legalName });
      if (validation.countryCode) setError('country_code', { type: 'manual', message: validation.countryCode });
      if (validation.emailContact) setError('email_contact', { type: 'manual', message: validation.emailContact });
      if (validation.emailEmergency) setError('email_emergency', { type: 'manual', message: validation.emailEmergency });
      if (validation.whatsapp) setError('whatsapp', { type: 'manual', message: validation.whatsapp });
      if (validation.bankInformation) setError('bank_information', { type: 'manual', message: validation.bankInformation });
      return;
    }

    setSaving(true);

    let bankInfo = null;
    if (data.bank_information) {
      try {
        bankInfo = JSON.parse(data.bank_information);
      } catch {
        setError('bank_information', { type: 'manual', message: 'La informacion bancaria debe ser un JSON valido.' });
        setSaving(false);
        return;
      }
    }

    const payload = {
      commercial_name: data.commercial_name.trim(),
      legal_name: data.legal_name.trim(),
      country_code: data.country_code.trim(),
      address: data.address?.trim() || null,
      whatsapp: data.whatsapp?.trim() || null,
      email_contact: data.email_contact.trim(),
      email_emergency: data.email_emergency?.trim() || null,
      tax_id: data.tax_id?.trim() || null,
      active: data.active === 'true',
      bank_information: bankInfo,
    };

    const { error: saveError } = await supabaseBrowser
      .from('agencies')
      .update(payload)
      .eq('id', agency.id);

    if (saveError) {
      error('No se pudo guardar el perfil de la agencia.');
      setSaving(false);
      return;
    }

    const logoUrl = data.logo_url?.trim() || null;
    const nextMascotBrainId = data.mascot_brain_id?.trim() || '';
    const nextMascotName = data.mascot_name?.trim() || null;
    const nextHeroConfig = { ...currentHeroConfig };

    if (nextMascotBrainId) {
      nextHeroConfig.mascot_brain_id = nextMascotBrainId;
    } else {
      delete nextHeroConfig.mascot_brain_id;
    }

    if (nextMascotName) {
      nextHeroConfig.mascot_name = nextMascotName;
    } else {
      delete nextHeroConfig.mascot_name;
    }

    const selectedMascotBrainOnSave =
      mascotBrainOptions.find((brain) => brain.id === nextMascotBrainId) || null;
    const mascotLogo = selectedMascotBrainOnSave?.logo_url || null;
    if (nextMascotBrainId && mascotLogo) {
      nextHeroConfig.mascot_brain_logo_url = mascotLogo;
    } else {
      delete nextHeroConfig.mascot_brain_logo_url;
    }

    const { error: brandingError } = await supabaseBrowser
      .from('agency_branding')
      .upsert(
        {
          agency_id: agency.id,
          logo_url: logoUrl,
          hero_config: nextHeroConfig,
        },
        { onConflict: 'agency_id' },
      );

    if (brandingError) {
      error('No se pudo guardar branding de la agencia.');
      setSaving(false);
      return;
    }

    success('Perfil de agencia actualizado.');
    router.refresh();
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="mx-auto max-w-6xl px-6">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-8 py-6">
            <h1 className="text-2xl font-semibold text-slate-800">Perfil de la Agencia</h1>
            <p className="mt-1 text-sm text-slate-500">Informacion comercial, legal y operativa</p>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="grid grid-cols-1 gap-6 px-8 py-8 md:grid-cols-2"
          >
            <Readonly label="ID">{agency.id}</Readonly>

            <Field label="Estado">
              <select {...register('active')} className="input">
                <option value="true">Activa</option>
                <option value="false">Inactiva</option>
              </select>
            </Field>

            <Field label="Nombre comercial" error={errors.commercial_name?.message}>
              <input {...register('commercial_name')} className={inputClass(Boolean(errors.commercial_name))} />
            </Field>

            <Field label="Nombre legal" error={errors.legal_name?.message}>
              <input {...register('legal_name')} className={inputClass(Boolean(errors.legal_name))} />
            </Field>

            <Field label="Codigo pais" error={errors.country_code?.message}>
              <input {...register('country_code')} className={inputClass(Boolean(errors.country_code))} />
            </Field>

            <Field label="WhatsApp" error={errors.whatsapp?.message}>
              <input {...register('whatsapp')} className={inputClass(Boolean(errors.whatsapp))} />
            </Field>

            <Field label="Email contacto" error={errors.email_contact?.message}>
              <input type="email" {...register('email_contact')} className={inputClass(Boolean(errors.email_contact))} />
            </Field>

            <Field label="Email emergencia" error={errors.email_emergency?.message}>
              <input type="email" {...register('email_emergency')} className={inputClass(Boolean(errors.email_emergency))} />
            </Field>

            <Field label="URL logo agencia">
              <input
                {...register('logo_url')}
                placeholder="https://..."
                className="input"
              />
            </Field>

            <Field label="Mascota-brain">
              <select {...register('mascot_brain_id')} className="input">
                <option value="">Sin mascota</option>
                {mascotBrainOptions.map((brain) => (
                  <option key={brain.id} value={brain.id}>
                    {brain.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Nombre de la mascota">
              <input
                {...register('mascot_name')}
                placeholder="Ej: IVI"
                className="input"
              />
            </Field>

            <Field label="Tax ID / NIF">
              <input {...register('tax_id')} className="input" />
            </Field>

            {mascotBrainId ? (
              <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Mascota configurada</p>
                <div className="mt-3 flex items-center gap-3">
                  {selectedMascotBrain?.logo_url ? (
                    <img
                      src={selectedMascotBrain.logo_url}
                      alt={selectedMascotBrain.name}
                      className="h-10 w-10 rounded-xl border border-slate-200 object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-500">
                      AI
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-slate-900">{watch('mascot_name') || selectedMascotBrain?.name || 'Mascota'}</p>
                    <p className="text-xs text-slate-500">Brain ID: {mascotBrainId}</p>
                  </div>
                </div>
              </div>
            ) : null}

            <Field label="Direccion">
              <input {...register('address')} className="input" />
            </Field>

            <div className="md:col-span-2">
              <Field label="Informacion bancaria (JSON)" error={errors.bank_information?.message}>
                <textarea
                  {...register('bank_information')}
                  rows={6}
                  className={`${inputClass(Boolean(errors.bank_information))} font-mono text-sm`}
                />
              </Field>
            </div>

            <Readonly label="Creado el">{createdAtLabel}</Readonly>

            <div className="md:col-span-2 flex justify-end border-t border-slate-200 pt-6">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}

function Readonly({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="input cursor-not-allowed bg-slate-100 text-slate-500">
        {children}
      </div>
    </div>
  );
}
