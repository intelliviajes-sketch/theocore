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
};

function inputClass(hasError?: boolean) {
  return `input ${hasError ? 'border-rose-400 bg-rose-50 text-rose-900 focus:border-rose-500' : ''}`.trim();
}

export default function AgencyProfile({ agency }: { agency: Agency }) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<AgencyProfileForm>();
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const { success, error } = useToast();

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
      });
    }
  }, [agency, reset]);

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

    if (!saveError) {
      success('Perfil de agencia actualizado.');
      router.refresh();
    } else {
      error('No se pudo guardar el perfil de la agencia.');
    }

    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="max-w-6xl mx-auto px-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
          <div className="px-8 py-6 border-b border-slate-200">
            <h1 className="text-2xl font-semibold text-slate-800">
              Perfil de la Agencia
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Informacion comercial, legal y operativa
            </p>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="px-8 py-8 grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <Readonly label="ID">
              {agency.id}
            </Readonly>

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

            <Field label="Direccion">
              <input {...register('address')} className="input" />
            </Field>

            <Field label="Tax ID / NIF">
              <input {...register('tax_id')} className="input" />
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

            <Readonly label="Creado el">
              {createdAtLabel}
            </Readonly>

            <div className="md:col-span-2 flex justify-end pt-6 border-t border-slate-200">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
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
      <div className="input bg-slate-100 text-slate-500 cursor-not-allowed">
        {children}
      </div>
    </div>
  );
}
