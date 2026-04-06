"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ImagePlus,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { useToast } from "@/components/system/ToastProvider";
import {
  archiveSocialPost,
  evaluateSocialPostQuality,
  generateBriefFromCatalog,
  generateCampaign360Playbook,
  generatePaidAdsSuggestion,
  generateSocialImageDirections,
  generateSocialLocalizations,
  generateSocialPostSuggestion,
  getSocialExecutiveSummary,
  isMissingSocialMediaSchemaError,
  listSocialAccounts,
  listSocialAssets,
  listSocialBrandSafetyRules,
  listSocialBriefs,
  listSocialCampaigns,
  listSocialCatalogOptions,
  listSocialCommentsInbox,
  listSocialHookLibrary,
  listSocialLeads,
  listAgencySocialMarkets,
  listSocialPlaybooks,
  listSocialPostLocalizations,
  listSocialPostVariants,
  listSocialPostingWindows,
  listSocialPosts,
  listSocialPublishLogs,
  listSocialTemplates,
  listSocialUtmRules,
  loadAgencySocialContext,
  loadSocialPermissions,
  registerSocialPublishLog,
  saveSocialAccount,
  saveSocialAsset,
  saveSocialBrandSafetyRule,
  saveSocialCommentInboxItem,
  saveSocialCampaign,
  saveSocialHookLibraryItem,
  saveSocialLead,
  saveSocialPlaybook,
  saveSocialPost,
  saveSocialPostLocalization,
  saveSocialPostVariant,
  saveSocialTemplate,
  saveSocialUtmRule,
  updateSocialPostSyncStatus,
} from "./api";
import {
  SOCIAL_CHANNELS,
  SOCIAL_POST_STATUSES,
  type SocialAccount,
  type SocialAsset,
  type SocialCampaign,
  type SocialCatalogOption,
  type SocialChannel,
  type SocialPermissions,
  type SocialImageDirection,
  type SocialBrandSafetyRule,
  type SocialBrief,
  type SocialCommentInbox,
  type SocialExecutiveSummary,
  type SocialHookLibraryItem,
  type SocialLead,
  type SocialMarketConfig,
  type SocialPaidAdsSuggestion,
  type SocialPlaybook,
  type SocialPostingWindow,
  type SocialPostLocalization,
  type SocialPost,
  type SocialPostDraft,
  type SocialPostVariant,
  type SocialPublishLog,
  type SocialTemplate,
  type SocialUtmRule,
} from "./types";

const CHANNEL_LABELS: Record<SocialChannel, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  youtube_shorts: "YouTube Shorts",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  review: "Revision",
  approved: "Aprobado",
  scheduled: "Programado",
  published: "Publicado",
  archived: "Archivado",
};

function createDraft(languageCode = "es", marketCode = ""): SocialPostDraft {
  return {
    campaign_id: null,
    related_catalog_id: null,
    title: "",
    hook: "",
    caption: "",
    channels: ["instagram"],
    hashtags: [],
    status: "draft",
    scheduled_at: null,
    published_at: null,
    cta_text: "Quiero mi propuesta",
    cta_url: "",
    destination_city: "",
    destination_country: "",
    market_code: marketCode,
    tone: "inspirador y premium",
    language_code: languageCode,
    asset_urls: [],
    utm_source: "social",
    utm_medium: "organic",
    utm_campaign: "",
    impressions: 0,
    clicks: 0,
    leads: 0,
    bookings: 0,
    engagement_rate: 0,
    active: true,
  };
}

function postToDraft(post: SocialPost): SocialPostDraft {
  return {
    id: post.id,
    campaign_id: post.campaign_id,
    related_catalog_id: post.related_catalog_id,
    title: post.title,
    hook: post.hook || "",
    caption: post.caption || "",
    channels: post.channels.length > 0 ? post.channels : ["instagram"],
    hashtags: post.hashtags,
    status: post.status,
    scheduled_at: post.scheduled_at,
    published_at: post.published_at,
    cta_text: post.cta_text || "",
    cta_url: post.cta_url || "",
    destination_city: post.destination_city || "",
    destination_country: post.destination_country || "",
    market_code: post.market_code || post.destination_country || "",
    tone: post.tone || "inspirador y premium",
    language_code: post.language_code || "es",
    asset_urls: post.asset_urls,
    utm_source: post.utm_source || "social",
    utm_medium: post.utm_medium || "organic",
    utm_campaign: post.utm_campaign || "",
    impressions: post.impressions,
    clicks: post.clicks,
    leads: post.leads,
    bookings: post.bookings,
    engagement_rate: post.engagement_rate,
    active: post.active,
  };
}

function parseHashtags(value: string) {
  return value
    .split(/[,\n ]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => (item.startsWith("#") ? item : `#${item}`))
    .slice(0, 12);
}

function parseTags(value: string) {
  return value
    .split(/[,\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function toLocalDateTimeInput(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const p = (v: number) => String(v).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(
    date.getHours(),
  )}:${p(date.getMinutes())}`;
}

function toIsoFromLocalDateTime(value: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function inputClass() {
  return "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";
}

function textareaClass() {
  return "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";
}

function badgeClass(status: SocialPost["status"]) {
  if (status === "published") return "bg-emerald-100 text-emerald-800";
  if (status === "scheduled") return "bg-indigo-100 text-indigo-800";
  if (status === "approved") return "bg-cyan-100 text-cyan-800";
  if (status === "review") return "bg-amber-100 text-amber-800";
  if (status === "archived") return "bg-slate-200 text-slate-700";
  return "bg-slate-100 text-slate-700";
}

type SocialContext = Awaited<ReturnType<typeof loadAgencySocialContext>>;

export default function SocialMediaStudio({ agencyId }: { agencyId: string }) {
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingAds, setGeneratingAds] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingAdsVariants, setSavingAdsVariants] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [generatingImages, setGeneratingImages] = useState(false);
  const [savingImageAssetId, setSavingImageAssetId] = useState<string | null>(null);

  const [context, setContext] = useState<SocialContext | null>(null);
  const [markets, setMarkets] = useState<SocialMarketConfig[]>([]);
  const [selectedMarketCode, setSelectedMarketCode] = useState("");
  const [permissions, setPermissions] = useState<SocialPermissions | null>(null);
  const [campaigns, setCampaigns] = useState<SocialCampaign[]>([]);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [catalogOptions, setCatalogOptions] = useState<SocialCatalogOption[]>([]);
  const [variants, setVariants] = useState<SocialPostVariant[]>([]);
  const [assets, setAssets] = useState<SocialAsset[]>([]);
  const [templates, setTemplates] = useState<SocialTemplate[]>([]);
  const [publishLogs, setPublishLogs] = useState<SocialPublishLog[]>([]);
  const [imageDirections, setImageDirections] = useState<SocialImageDirection[]>([]);
  const [paidAdsSuggestion, setPaidAdsSuggestion] = useState<SocialPaidAdsSuggestion | null>(null);
  const [utmRules, setUtmRules] = useState<SocialUtmRule[]>([]);
  const [brandSafetyRule, setBrandSafetyRule] = useState<SocialBrandSafetyRule | null>(null);
  const [hookLibrary, setHookLibrary] = useState<SocialHookLibraryItem[]>([]);
  const [localizations, setLocalizations] = useState<SocialPostLocalization[]>([]);
  const [postingWindows, setPostingWindows] = useState<SocialPostingWindow[]>([]);
  const [briefs, setBriefs] = useState<SocialBrief[]>([]);
  const [commentsInbox, setCommentsInbox] = useState<SocialCommentInbox[]>([]);
  const [leads, setLeads] = useState<SocialLead[]>([]);
  const [playbooks, setPlaybooks] = useState<SocialPlaybook[]>([]);
  const [executive, setExecutive] = useState<SocialExecutiveSummary | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | SocialPost["status"]>("all");
  const [draft, setDraft] = useState<SocialPostDraft>(createDraft());
  const [hashtagsInput, setHashtagsInput] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [templateProductType, setTemplateProductType] = useState("");
  const [assetTitle, setAssetTitle] = useState("");
  const [assetUrl, setAssetUrl] = useState("");
  const [assetTags, setAssetTags] = useState("");
  const [localizationTargets, setLocalizationTargets] = useState("en-US,pt-BR");
  const [utmSource, setUtmSource] = useState("social");
  const [utmMedium, setUtmMedium] = useState("organic");
  const [utmPrefix, setUtmPrefix] = useState("launch_");
  const [blockedTermsInput, setBlockedTermsInput] = useState("");
  const [requiredTermsInput, setRequiredTermsInput] = useState("");
  const [newHookText, setNewHookText] = useState("");
  const [newComment, setNewComment] = useState("");
  const [newLeadName, setNewLeadName] = useState("");
  const [newLeadEmail, setNewLeadEmail] = useState("");
  const [newLeadBudget, setNewLeadBudget] = useState("");
  const [playbookName, setPlaybookName] = useState("Campana 360");
  const [playbookObjective, setPlaybookObjective] = useState("Generar leads cualificados");
  const [playbookAudience, setPlaybookAudience] = useState("Viajeros premium");

  const [openCampaignModal, setOpenCampaignModal] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [openAccountModal, setOpenAccountModal] = useState(false);
  const [accountChannel, setAccountChannel] = useState<SocialChannel>("instagram");
  const [accountHandle, setAccountHandle] = useState("");

  const campaignById = useMemo(() => new Map(campaigns.map((item) => [item.id, item])), [campaigns]);
  const catalogById = useMemo(() => new Map(catalogOptions.map((item) => [item.id, item])), [catalogOptions]);
  const normalizedDraft = useMemo(() => ({ ...draft, hashtags: parseHashtags(hashtagsInput) }), [draft, hashtagsInput]);
  const quality = useMemo(() => evaluateSocialPostQuality(normalizedDraft), [normalizedDraft]);

  const postsForMarket = useMemo(() => {
    const activeMarket = selectedMarketCode.trim().toUpperCase();
    if (!activeMarket) return posts;
    return posts.filter((item) => {
      const market = (item.market_code || "").toUpperCase();
      return market === activeMarket || market.length === 0;
    });
  }, [posts, selectedMarketCode]);

  const reminders = useMemo(() => {
    const now = Date.now();
    const dayLimit = now + 24 * 60 * 60 * 1000;
    return postsForMarket
      .filter((item) => item.status === "scheduled" && item.scheduled_at)
      .filter((item) => {
        const t = new Date(item.scheduled_at as string).getTime();
        return t >= now && t <= dayLimit;
      })
      .slice(0, 5);
  }, [postsForMarket]);

  const filteredPosts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return postsForMarket.filter((post) => {
      const matchesSearch = !term || [post.title, post.hook || "", post.caption || ""].join(" ").toLowerCase().includes(term);
      const matchesStatus = statusFilter === "all" || post.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [postsForMarket, search, statusFilter]);

  const summary = useMemo(() => {
    const impressions = postsForMarket.reduce((acc, item) => acc + item.impressions, 0);
    const clicks = postsForMarket.reduce((acc, item) => acc + item.clicks, 0);
    const leads = postsForMarket.reduce((acc, item) => acc + item.leads, 0);
    const bookings = postsForMarket.reduce((acc, item) => acc + item.bookings, 0);
    const budget = campaigns.reduce((acc, item) => acc + Number(item.budget || 0), 0);
    return {
      campaigns: campaigns.length,
      pipeline: postsForMarket.length,
      scheduled: postsForMarket.filter((item) => item.status === "scheduled").length,
      published: postsForMarket.filter((item) => item.status === "published").length,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      cpl: leads > 0 ? budget / leads : 0,
      bookings,
    };
  }, [campaigns, postsForMarket]);

  const reload = useCallback(
    async (preferredPostId?: string | null, marketCodeOverride?: string | null) => {
      setLoading(true);
      setSchemaMissing(false);
      try {
        const requestedMarketCode = (marketCodeOverride || selectedMarketCode || "").trim().toUpperCase();
        const [
          marketsData,
          contextData,
          campaignsData,
          postsData,
          accountsData,
          catalogData,
          assetsData,
          templatesData,
          permissionsData,
          utmRulesData,
          brandSafetyData,
          hookLibraryData,
          postingWindowsData,
          briefsData,
          commentsData,
          leadsData,
          playbooksData,
          executiveData,
        ] =
          await Promise.all([
            listAgencySocialMarkets(agencyId),
            loadAgencySocialContext(agencyId, requestedMarketCode || null),
            listSocialCampaigns(agencyId),
            listSocialPosts(agencyId),
            listSocialAccounts(agencyId),
            listSocialCatalogOptions(agencyId),
            listSocialAssets(agencyId),
            listSocialTemplates(agencyId),
            loadSocialPermissions(agencyId),
            listSocialUtmRules(agencyId),
            listSocialBrandSafetyRules(agencyId),
            listSocialHookLibrary(agencyId),
            listSocialPostingWindows(agencyId),
            listSocialBriefs(agencyId),
            listSocialCommentsInbox(agencyId),
            listSocialLeads(agencyId),
            listSocialPlaybooks(agencyId),
            getSocialExecutiveSummary(agencyId),
          ]);
        const resolvedMarketCode =
          requestedMarketCode ||
          contextData.marketCode ||
          contextData.countryCode ||
          marketsData[0]?.country_code ||
          "";
        const normalizedResolvedMarketCode = resolvedMarketCode.toUpperCase();

        setMarkets(marketsData);
        setSelectedMarketCode(normalizedResolvedMarketCode);
        setContext(contextData);
        setCampaigns(campaignsData);
        setPosts(postsData);
        setAccounts(accountsData);
        setCatalogOptions(catalogData);
        setAssets(assetsData);
        setTemplates(templatesData);
        setPermissions(permissionsData);
        setUtmRules(utmRulesData);
        setBrandSafetyRule(brandSafetyData);
        setHookLibrary(hookLibraryData);
        setPostingWindows(postingWindowsData);
        setBriefs(briefsData);
        setCommentsInbox(commentsData);
        setLeads(leadsData);
        setPlaybooks(playbooksData);
        setExecutive(executiveData);
        if (utmRulesData[0]) {
          setUtmSource(utmRulesData[0].source);
          setUtmMedium(utmRulesData[0].medium);
          setUtmPrefix(utmRulesData[0].campaign_prefix);
        }
        if (brandSafetyData) {
          setBlockedTermsInput(brandSafetyData.blocked_terms.join(", "));
          setRequiredTermsInput(brandSafetyData.required_terms.join(", "));
        }

        const postsByMarket = normalizedResolvedMarketCode
          ? postsData.filter((item) => {
              const market = (item.market_code || "").toUpperCase();
              return market === normalizedResolvedMarketCode || market.length === 0;
            })
          : postsData;
        const selectedPost =
          (preferredPostId ? postsByMarket.find((item) => item.id === preferredPostId) : null) ||
          postsByMarket[0];
        if (selectedPost) {
          setDraft(postToDraft(selectedPost));
          setHashtagsInput(selectedPost.hashtags.join(", "));
          setImageDirections([]);
          setPaidAdsSuggestion(null);
        } else {
          setDraft(createDraft(contextData.languageCode, normalizedResolvedMarketCode));
          setHashtagsInput("");
          setImageDirections([]);
          setPaidAdsSuggestion(null);
        }
      } catch (loadError) {
        console.error(loadError);
        if (isMissingSocialMediaSchemaError(loadError)) setSchemaMissing(true);
        showError("No se pudo cargar Social media.");
      } finally {
        setLoading(false);
      }
    },
    [agencyId, selectedMarketCode, showError],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    async function loadSecondaryData() {
      if (!draft.id) {
        setVariants([]);
        setPublishLogs([]);
        setLocalizations([]);
        return;
      }
      try {
        const [variantsData, logsData, localizationsData] = await Promise.all([
          listSocialPostVariants(agencyId, draft.id),
          listSocialPublishLogs(agencyId, draft.id),
          listSocialPostLocalizations(agencyId, draft.id),
        ]);
        setVariants(variantsData);
        setPublishLogs(logsData);
        setLocalizations(localizationsData);
      } catch (secondaryError) {
        console.error(secondaryError);
      }
    }
    void loadSecondaryData();
  }, [agencyId, draft.id]);

  function openPost(post: SocialPost) {
    setDraft(postToDraft(post));
    setHashtagsInput(post.hashtags.join(", "));
    setImageDirections([]);
    setPaidAdsSuggestion(null);
  }

  function newPost() {
    if (permissions && !permissions.can_create_posts) {
      showError("Tu perfil no tiene permiso para crear piezas.");
      return;
    }
    setDraft(
      createDraft(
        context?.languageCode || "es",
        selectedMarketCode || context?.marketCode || context?.countryCode || "",
      ),
    );
    setHashtagsInput("");
    setVariants([]);
    setPublishLogs([]);
    setImageDirections([]);
    setPaidAdsSuggestion(null);
  }

  function onChangeActiveMarket(nextMarketCode: string) {
    const normalized = (nextMarketCode || "").trim().toUpperCase();
    if (!normalized) return;
    setSelectedMarketCode(normalized);
    void reload(null, normalized);
  }

  function updateDraft<K extends keyof SocialPostDraft>(key: K, value: SocialPostDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function onSavePost() {
    const isEdit = Boolean(draft.id);
    if (isEdit && permissions && !permissions.can_edit_posts) {
      showError("Tu perfil no tiene permiso para editar piezas.");
      return;
    }
    if (!isEdit && permissions && !permissions.can_create_posts) {
      showError("Tu perfil no tiene permiso para crear piezas.");
      return;
    }
    if (normalizedDraft.status === "approved" && permissions && !permissions.can_approve_posts) {
      showError("Tu perfil no tiene permiso para aprobar piezas.");
      return;
    }
    if ((normalizedDraft.status === "scheduled" || normalizedDraft.status === "published") && permissions && !permissions.can_publish_posts) {
      showError("Tu perfil no tiene permiso para publicar o programar.");
      return;
    }
    if (!normalizedDraft.title.trim()) {
      showError("El titulo es obligatorio.");
      return;
    }
    setSaving(true);
    try {
      const postId = await saveSocialPost(agencyId, normalizedDraft);
      await reload(postId);
      success("Pieza guardada.");
    } catch (saveError) {
      console.error(saveError);
      showError(saveError instanceof Error ? saveError.message : "No se pudo guardar la pieza.");
    } finally {
      setSaving(false);
    }
  }

  async function onArchivePost() {
    if (!draft.id) return;
    if (permissions && !permissions.can_edit_posts) {
      showError("Tu perfil no tiene permiso para archivar piezas.");
      return;
    }
    setSaving(true);
    try {
      await archiveSocialPost(agencyId, draft.id);
      await reload();
      success("Pieza archivada.");
    } catch (archiveError) {
      console.error(archiveError);
      showError("No se pudo archivar.");
    } finally {
      setSaving(false);
    }
  }

  async function onGenerate() {
    setGenerating(true);
    try {
      const suggestion = await generateSocialPostSuggestion({
        context: context || {
          agencyName: "Agencia",
          countryCode: null,
          languageCode: "es",
          logoUrl: null,
          mascotName: null,
          brain: null,
        },
        post: {
          title: draft.title,
          destination_city: draft.destination_city,
          destination_country: draft.destination_country,
          tone: draft.tone,
          channels: draft.channels,
          cta_url: draft.cta_url,
          utm_campaign: draft.utm_campaign,
        },
        campaignName: draft.campaign_id ? campaignById.get(draft.campaign_id)?.name || null : null,
        catalogSummary: draft.related_catalog_id ? catalogById.get(draft.related_catalog_id)?.summary || null : null,
      });
      setDraft((current) => ({
        ...current,
        title: suggestion.title || current.title,
        hook: suggestion.hook || current.hook,
        caption: suggestion.caption || current.caption,
        cta_text: suggestion.cta_text || current.cta_text,
        cta_url: suggestion.cta_url || current.cta_url,
      }));
      setHashtagsInput(suggestion.hashtags.join(", "));
      success("Copy generado con IA.");
    } catch (generationError) {
      console.error(generationError);
      showError("No se pudo generar copy con IA.");
    } finally {
      setGenerating(false);
    }
  }

  async function onGeneratePaidAds() {
    setGeneratingAds(true);
    try {
      const suggestion = await generatePaidAdsSuggestion({
        context: context || {
          agencyName: "Agencia",
          countryCode: null,
          languageCode: "es",
          logoUrl: null,
          mascotName: null,
          brain: null,
        },
        post: {
          title: draft.title,
          hook: draft.hook,
          caption: draft.caption,
          destination_city: draft.destination_city,
          destination_country: draft.destination_country,
          tone: draft.tone,
          cta_text: draft.cta_text,
          cta_url: draft.cta_url,
          utm_campaign: draft.utm_campaign,
          language_code: draft.language_code,
        },
        campaignName: draft.campaign_id ? campaignById.get(draft.campaign_id)?.name || null : null,
        catalogSummary: draft.related_catalog_id ? catalogById.get(draft.related_catalog_id)?.summary || null : null,
      });
      setPaidAdsSuggestion(suggestion);
      success("Google Ads y Facebook Ads generados.");
    } catch (adsError) {
      console.error(adsError);
      showError("No se pudieron generar anuncios de pago.");
    } finally {
      setGeneratingAds(false);
    }
  }

  async function onSavePaidAdsAsVariants() {
    if (!draft.id) {
      showError("Guarda la pieza antes de guardar anuncios.");
      return;
    }
    if (!paidAdsSuggestion) {
      showError("Genera primero Google Ads y Facebook Ads.");
      return;
    }
    if (permissions && !permissions.can_edit_posts) {
      showError("Tu perfil no tiene permiso para editar variantes.");
      return;
    }

    const googleHeadlines = paidAdsSuggestion.google.headlines.slice(0, 2);
    const facebookHeadlines = paidAdsSuggestion.facebook.headlines.slice(0, 2);
    const facebookPrimaryTexts = paidAdsSuggestion.facebook.primary_texts.slice(0, 2);

    const variantPayloads = [
      ...googleHeadlines.map((headline, index) => ({
        post_id: draft.id as string,
        variant_label: `Google Ads ${index + 1}`,
        channel: null as SocialChannel | null,
        hook: headline,
        caption: paidAdsSuggestion.google.descriptions[0] || null,
        cta_text: draft.cta_text || paidAdsSuggestion.facebook.cta_texts[0] || "Solicitar propuesta",
        score: 80,
      })),
      ...facebookHeadlines.map((headline, index) => ({
        post_id: draft.id as string,
        variant_label: `Facebook Ads ${index + 1}`,
        channel: "facebook" as SocialChannel,
        hook: headline,
        caption: facebookPrimaryTexts[index] || facebookPrimaryTexts[0] || null,
        cta_text: paidAdsSuggestion.facebook.cta_texts[index] || paidAdsSuggestion.facebook.cta_texts[0] || "Enviar mensaje",
        score: 82,
      })),
    ];

    if (variantPayloads.length === 0) {
      showError("No hay contenido de anuncios para guardar.");
      return;
    }

    setSavingAdsVariants(true);
    try {
      await Promise.all(
        variantPayloads.map((payload) =>
          saveSocialPostVariant(agencyId, payload),
        ),
      );
      const fresh = await listSocialPostVariants(agencyId, draft.id);
      setVariants(fresh);
      success("Anuncios guardados como variantes.");
    } catch (variantError) {
      console.error(variantError);
      showError("No se pudieron guardar variantes de anuncios.");
    } finally {
      setSavingAdsVariants(false);
    }
  }

  async function onGenerateImagesByChannel() {
    if (!draft.destination_city.trim() && !draft.destination_country.trim()) {
      showError("Define destino (ciudad o pais) para generar imagenes por canal.");
      return;
    }
    setGeneratingImages(true);
    try {
      const directions = await generateSocialImageDirections({
        context: context || {
          agencyName: "Agencia",
          countryCode: null,
          languageCode: "es",
          logoUrl: null,
          mascotName: null,
          brain: null,
        },
        post: {
          title: draft.title,
          destination_city: draft.destination_city,
          destination_country: draft.destination_country,
          tone: draft.tone,
          channels: draft.channels,
          caption: draft.caption,
        },
      });
      setImageDirections(directions);
      success("Direccion visual por canal generada.");
    } catch (generationError) {
      console.error(generationError);
      showError("No se pudo generar direccion de imagen por canal.");
    } finally {
      setGeneratingImages(false);
    }
  }

  function onUseGeneratedImage(direction: SocialImageDirection) {
    setDraft((current) => {
      if (current.asset_urls.includes(direction.preview_url)) return current;
      return { ...current, asset_urls: [...current.asset_urls, direction.preview_url] };
    });
    success(`Imagen sugerida agregada a la pieza (${CHANNEL_LABELS[direction.channel]}).`);
  }

  async function onSaveGeneratedImageAsAsset(direction: SocialImageDirection) {
    if (permissions && !permissions.can_manage_assets) {
      showError("Tu perfil no tiene permiso para gestionar assets.");
      return;
    }
    setSavingImageAssetId(`${direction.channel}-${direction.query}`);
    try {
      await saveSocialAsset(agencyId, {
        title: `${draft.destination_city || "Destino"} - ${CHANNEL_LABELS[direction.channel]}`,
        asset_url: direction.preview_url,
        destination_tags: parseTags(`${draft.destination_city},${draft.destination_country}`),
        channels: [direction.channel],
      });
      const fresh = await listSocialAssets(agencyId);
      setAssets(fresh);
      success(`Asset guardado para ${CHANNEL_LABELS[direction.channel]}.`);
    } catch (assetError) {
      console.error(assetError);
      showError("No se pudo guardar el asset generado.");
    } finally {
      setSavingImageAssetId(null);
    }
  }

  async function onSaveCampaign() {
    if (!campaignName.trim()) {
      showError("Nombre de campana obligatorio.");
      return;
    }
    try {
      await saveSocialCampaign(agencyId, { name: campaignName, status: "draft" });
      await reload(draft.id || null);
      setCampaignName("");
      setOpenCampaignModal(false);
      success("Campana creada.");
    } catch (campaignError) {
      console.error(campaignError);
      showError("No se pudo crear la campana.");
    }
  }

  async function onSaveAccount() {
    if (!accountHandle.trim()) {
      showError("Handle obligatorio.");
      return;
    }
    try {
      await saveSocialAccount(agencyId, { channel: accountChannel, handle: accountHandle, account_name: null });
      await reload(draft.id || null);
      setAccountHandle("");
      setOpenAccountModal(false);
      success("Canal vinculado.");
    } catch (accountError) {
      console.error(accountError);
      showError("No se pudo guardar el canal.");
    }
  }

  async function onGenerateVariants() {
    if (!draft.id) {
      showError("Guarda la pieza antes de crear variantes.");
      return;
    }
    if (permissions && !permissions.can_edit_posts) {
      showError("Tu perfil no tiene permiso para editar variantes.");
      return;
    }
    setSaving(true);
    try {
      const baseHook = draft.hook || draft.title;
      const baseCaption = draft.caption || "";
      const channel = draft.channels[0] || "instagram";
      await Promise.all([
        saveSocialPostVariant(agencyId, {
          post_id: draft.id,
          variant_label: "A",
          channel,
          hook: `${baseHook} - oferta limitada`,
          caption: `${baseCaption}\n\nReserva hoy y asegura tu mejor tarifa.`,
          cta_text: draft.cta_text,
          score: 75,
        }),
        saveSocialPostVariant(agencyId, {
          post_id: draft.id,
          variant_label: "B",
          channel,
          hook: `${baseHook} - experiencia premium`,
          caption: `${baseCaption}\n\nTe diseniamos un viaje 100% personalizado.`,
          cta_text: draft.cta_text,
          score: 78,
        }),
      ]);
      const fresh = await listSocialPostVariants(agencyId, draft.id);
      setVariants(fresh);
      success("Variantes A/B generadas.");
    } catch (variantError) {
      console.error(variantError);
      showError("No se pudieron generar variantes.");
    } finally {
      setSaving(false);
    }
  }

  async function onSaveVariants() {
    if (!draft.id) return;
    setSaving(true);
    try {
      await Promise.all(
        variants.map((item) =>
          saveSocialPostVariant(agencyId, {
            id: item.id,
            post_id: draft.id as string,
            variant_label: item.variant_label,
            channel: item.channel,
            hook: item.hook,
            caption: item.caption,
            cta_text: item.cta_text,
            score: item.score,
            active: item.active,
          }),
        ),
      );
      const fresh = await listSocialPostVariants(agencyId, draft.id);
      setVariants(fresh);
      success("Variantes actualizadas.");
    } catch (variantSaveError) {
      console.error(variantSaveError);
      showError("No se pudieron guardar las variantes.");
    } finally {
      setSaving(false);
    }
  }

  async function onSaveAsset() {
    if (permissions && !permissions.can_manage_assets) {
      showError("Tu perfil no tiene permiso para gestionar assets.");
      return;
    }
    if (!assetTitle.trim() || !assetUrl.trim()) {
      showError("Completa titulo y URL del asset.");
      return;
    }
    try {
      await saveSocialAsset(agencyId, {
        title: assetTitle,
        asset_url: assetUrl,
        destination_tags: parseTags(assetTags),
        channels: draft.channels,
      });
      const fresh = await listSocialAssets(agencyId);
      setAssets(fresh);
      setAssetTitle("");
      setAssetUrl("");
      setAssetTags("");
      success("Asset guardado.");
    } catch (assetError) {
      console.error(assetError);
      showError("No se pudo guardar el asset.");
    }
  }

  async function onSaveTemplate() {
    if (permissions && !permissions.can_manage_templates) {
      showError("Tu perfil no tiene permiso para gestionar templates.");
      return;
    }
    if (!templateName.trim()) {
      showError("Nombre del template obligatorio.");
      return;
    }
    try {
      await saveSocialTemplate(agencyId, {
        name: templateName,
        product_type: templateProductType || null,
        title_template: draft.title,
        hook_template: draft.hook,
        caption_template: draft.caption,
        default_tone: draft.tone,
        default_channels: draft.channels,
      });
      const fresh = await listSocialTemplates(agencyId);
      setTemplates(fresh);
      setTemplateName("");
      setTemplateProductType("");
      success("Template guardado.");
    } catch (templateError) {
      console.error(templateError);
      showError("No se pudo guardar el template.");
    }
  }

  function applyTemplate(template: SocialTemplate) {
    setDraft((current) => ({
      ...current,
      title: template.title_template || current.title,
      hook: template.hook_template || current.hook,
      caption: template.caption_template || current.caption,
      tone: template.default_tone || current.tone,
      channels: template.default_channels.length > 0 ? template.default_channels : current.channels,
    }));
    success(`Template aplicado: ${template.name}`);
  }

  function attachAsset(asset: SocialAsset) {
    setDraft((current) => {
      if (current.asset_urls.includes(asset.asset_url)) return current;
      return { ...current, asset_urls: [...current.asset_urls, asset.asset_url] };
    });
  }

  async function onSync(status: "synced" | "failed") {
    if (!draft.id) return;
    setSyncing(true);
    try {
      await updateSocialPostSyncStatus(agencyId, draft.id, {
        sync_status: status,
        last_sync_error: status === "failed" ? "Fallo de sincronizacion manual" : null,
      });
      await registerSocialPublishLog(agencyId, {
        post_id: draft.id,
        status: status === "synced" ? "published" : "failed",
        provider: "manual",
        message:
          status === "synced"
            ? "Sincronizado correctamente con canal."
            : "Error de sincronizacion reportado manualmente.",
      });
      await reload(draft.id);
      success(status === "synced" ? "Sync actualizado como exitoso." : "Sync actualizado como fallido.");
    } catch (syncError) {
      console.error(syncError);
      showError("No se pudo actualizar el estado de sync.");
    } finally {
      setSyncing(false);
    }
  }

  function parseLocalizationTargets() {
    return localizationTargets
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const [language_code, market_code] = item.split("-");
        return {
          language_code: (language_code || "es").toLowerCase(),
          market_code: market_code ? market_code.toUpperCase() : null,
        };
      });
  }

  async function onSaveUtmGovernance() {
    try {
      const existing = utmRules.find((item) => item.channel === null);
      await saveSocialUtmRule(agencyId, {
        id: existing?.id,
        channel: null,
        source: utmSource,
        medium: utmMedium,
        campaign_prefix: utmPrefix,
        enforce_campaign: true,
        enforce_channel_suffix: true,
      });
      const fresh = await listSocialUtmRules(agencyId);
      setUtmRules(fresh);
      success("Regla UTM guardada.");
    } catch (utmError) {
      console.error(utmError);
      showError("No se pudo guardar la regla UTM.");
    }
  }

  async function onSaveBrandSafety() {
    try {
      await saveSocialBrandSafetyRule(agencyId, {
        id: brandSafetyRule?.id,
        blocked_terms: parseTags(blockedTermsInput),
        required_terms: parseTags(requiredTermsInput),
        max_caps_ratio: brandSafetyRule?.max_caps_ratio || 0.35,
        max_emojis: brandSafetyRule?.max_emojis || 8,
      });
      const fresh = await listSocialBrandSafetyRules(agencyId);
      setBrandSafetyRule(fresh);
      success("Reglas de brand safety actualizadas.");
    } catch (brandError) {
      console.error(brandError);
      showError("No se pudieron guardar reglas de brand safety.");
    }
  }

  async function onAddHookLibrary() {
    if (!newHookText.trim()) {
      showError("Escribe un hook.");
      return;
    }
    try {
      await saveSocialHookLibraryItem(agencyId, {
        hook_text: newHookText,
        channel: draft.channels[0] || "instagram",
        destination_city: draft.destination_city || null,
        product_type: templateProductType || null,
      });
      const fresh = await listSocialHookLibrary(agencyId);
      setHookLibrary(fresh);
      setNewHookText("");
      success("Hook agregado a la libreria.");
    } catch (hookError) {
      console.error(hookError);
      showError("No se pudo guardar hook.");
    }
  }

  async function onGenerateLocalizations() {
    if (!draft.id) {
      showError("Guarda primero la pieza para localizacion.");
      return;
    }
    try {
      const targets = parseLocalizationTargets();
      if (targets.length === 0) {
        showError("Define al menos un target de idioma.");
        return;
      }
      await generateSocialLocalizations({
        agencyId,
        context: context || {
          agencyName: "Agencia",
          countryCode: null,
          languageCode: "es",
          logoUrl: null,
          mascotName: null,
          brain: null,
        },
        postId: draft.id,
        base: {
          title: draft.title,
          hook: draft.hook,
          caption: draft.caption,
          cta_text: draft.cta_text,
          hashtags: parseHashtags(hashtagsInput),
          destination_city: draft.destination_city,
          destination_country: draft.destination_country,
        },
        targets,
      });
      const fresh = await listSocialPostLocalizations(agencyId, draft.id);
      setLocalizations(fresh);
      success("Localizaciones generadas.");
    } catch (locError) {
      console.error(locError);
      showError("No se pudieron generar localizaciones.");
    }
  }

  async function onCreateBriefFromCatalog() {
    if (!draft.related_catalog_id) {
      showError("Selecciona un producto de catalogo.");
      return;
    }
    const catalog = catalogById.get(draft.related_catalog_id);
    if (!catalog) {
      showError("No se encontro el producto del catalogo.");
      return;
    }
    try {
      await generateBriefFromCatalog({
        agencyId,
        context: context || {
          agencyName: "Agencia",
          countryCode: null,
          languageCode: "es",
          logoUrl: null,
          mascotName: null,
          brain: null,
        },
        campaignId: draft.campaign_id,
        catalogId: draft.related_catalog_id,
        catalogTitle: catalog.title || "Producto",
        catalogSummary: catalog.summary || "Producto turistico",
      });
      const fresh = await listSocialBriefs(agencyId);
      setBriefs(fresh);
      success("Brief generado desde catalogo.");
    } catch (briefError) {
      console.error(briefError);
      showError("No se pudo generar brief.");
    }
  }

  async function onCreateInboxComment() {
    if (!newComment.trim()) {
      showError("Escribe un comentario.");
      return;
    }
    try {
      await saveSocialCommentInboxItem(agencyId, {
        channel: draft.channels[0] || "instagram",
        post_id: draft.id || null,
        author_handle: "@lead_social",
        content: newComment,
        sentiment: "neutral",
        intent: "consulta",
        priority: "normal",
        status: "open",
      });
      const fresh = await listSocialCommentsInbox(agencyId);
      setCommentsInbox(fresh);
      setNewComment("");
      success("Comentario agregado al inbox.");
    } catch (commentError) {
      console.error(commentError);
      showError("No se pudo guardar comentario.");
    }
  }

  async function onCreateLead() {
    if (!newLeadName.trim() && !newLeadEmail.trim()) {
      showError("Ingresa al menos nombre o email.");
      return;
    }
    try {
      await saveSocialLead(agencyId, {
        source_post_id: draft.id || null,
        contact_name: newLeadName || null,
        contact_email: newLeadEmail || null,
        destination_interest: draft.destination_city || draft.destination_country || null,
        budget_estimate: newLeadBudget ? Number(newLeadBudget) : null,
        travelers_count: 2,
        status: "new",
        notes: "Lead generado desde Social Studio",
      });
      const fresh = await listSocialLeads(agencyId);
      setLeads(fresh);
      setNewLeadName("");
      setNewLeadEmail("");
      setNewLeadBudget("");
      success("Lead social creado.");
    } catch (leadError) {
      console.error(leadError);
      showError("No se pudo crear lead.");
    }
  }

  async function onCreatePlaybook360() {
    try {
      await generateCampaign360Playbook({
        agencyId,
        context: context || {
          agencyName: "Agencia",
          countryCode: null,
          languageCode: "es",
          logoUrl: null,
          mascotName: null,
          brain: null,
        },
        campaignId: draft.campaign_id,
        name: playbookName,
        objective: playbookObjective,
        audience: playbookAudience,
      });
      const [freshPlaybooks, freshExecutive] = await Promise.all([
        listSocialPlaybooks(agencyId),
        getSocialExecutiveSummary(agencyId),
      ]);
      setPlaybooks(freshPlaybooks);
      setExecutive(freshExecutive);
      success("Playbook 360 generado.");
    } catch (playbookError) {
      console.error(playbookError);
      showError("No se pudo generar playbook 360.");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-2 text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando Social media...
      </div>
    );
  }

  if (schemaMissing) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        Falta crear el esquema SQL del modulo Social media. Ejecuta el SQL.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/60 bg-white/85 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/75">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-300">Social media</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">Studio operativo</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Sprints activos: calidad, A/B, assets, templates, sync y KPIs.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={selectedMarketCode}
              onChange={(e) => onChangeActiveMarket(e.target.value)}
              className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              title="Mercado activo"
            >
              {markets.map((market) => (
                <option key={market.id} value={market.country_code}>
                  Mercado {market.country_code} - {market.language_code.toUpperCase()}
                </option>
              ))}
            </select>
            <button onClick={() => setOpenCampaignModal(true)} className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-800 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-700">Nueva campana</button>
            <button onClick={() => setOpenAccountModal(true)} className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-800 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-700">Vincular canal</button>
            <button onClick={newPost} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-3 py-2 text-xs font-semibold text-white"><Plus className="h-3.5 w-3.5" />Nueva pieza</button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-7">
          <SummaryCard label="Campanas" value={String(summary.campaigns)} />
          <SummaryCard label="Pipeline" value={String(summary.pipeline)} />
          <SummaryCard label="Programadas" value={String(summary.scheduled)} />
          <SummaryCard label="Publicadas" value={String(summary.published)} />
          <SummaryCard label="CTR" value={`${summary.ctr.toFixed(1)}%`} />
          <SummaryCard label="CPL" value={`${summary.cpl.toFixed(2)} EUR`} />
          <SummaryCard label="Bookings" value={String(summary.bookings)} />
        </div>

        {reminders.length > 0 ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">Recordatorios proximos</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {reminders.map((item) => (
                <button key={item.id} onClick={() => openPost(item)} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs text-amber-900 ring-1 ring-amber-200"><CalendarClock className="h-3.5 w-3.5" />{item.title} - {toLocalDateTimeInput(item.scheduled_at)}</button>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.38fr_0.62fr]">
        <div className="space-y-3 rounded-3xl border border-white/60 bg-white/85 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/75">
          <input value={search} onChange={(e) => setSearch(e.target.value)} className={inputClass()} placeholder="Buscar piezas..." />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "all" | SocialPost["status"])} className={inputClass()}>
            <option value="all">Estado: todos</option>
            {SOCIAL_POST_STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}
          </select>
          <div className="max-h-[64vh] space-y-2 overflow-y-auto pr-1">
            {filteredPosts.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-300">No hay piezas para este filtro.</p> : null}
            {filteredPosts.map((post) => (
              <button key={post.id} onClick={() => openPost(post)} className={`w-full rounded-2xl border p-3 text-left ${draft.id === post.id ? "border-cyan-300 bg-cyan-50 dark:border-cyan-700 dark:bg-cyan-950/30" : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"}`}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{post.title}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] ${badgeClass(post.status)}`}>{STATUS_LABELS[post.status]}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{post.hook || post.caption || "Sin contenido"}</p>
                <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">Calidad {post.quality_score.toFixed(0)} / Sync {post.sync_status.toUpperCase()}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4 rounded-3xl border border-white/60 bg-white/85 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/75">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{draft.id ? "Editar pieza" : "Nueva pieza"}</h2>
            <div className="flex gap-2">
              <button onClick={onGenerate} disabled={generating} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">{generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}IA copy</button>
              <button onClick={onGenerateImagesByChannel} disabled={generatingImages} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">{generatingImages ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}IA imagen</button>
              {draft.id ? <button onClick={onArchivePost} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"><Trash2 className="h-3.5 w-3.5" />Archivar</button> : null}
              <button onClick={onSavePost} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}Guardar</button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">Calidad editorial</p>
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{quality.score.toFixed(0)} / 100</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"><div className={`${quality.score >= 75 ? "bg-emerald-500" : quality.score >= 60 ? "bg-amber-500" : "bg-rose-500"} h-full`} style={{ width: `${Math.max(5, quality.score)}%` }} /></div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[11px] ${quality.readyForSchedule ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>Programable: {quality.readyForSchedule ? "Si" : "No"}</span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] ${quality.readyForPublish ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>Publicable: {quality.readyForPublish ? "Si" : "No"}</span>
            </div>
            {quality.flags.length > 0 ? <div className="mt-3 flex flex-wrap gap-2">{quality.flags.map((flag) => <span key={flag} className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-900"><AlertTriangle className="h-3 w-3" />{flag}</span>)}</div> : null}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Titulo"><input value={draft.title} onChange={(e) => updateDraft("title", e.target.value)} className={inputClass()} /></Field>
            <Field label="Campana"><select value={draft.campaign_id || ""} onChange={(e) => updateDraft("campaign_id", e.target.value || null)} className={inputClass()}><option value="">Sin campana</option>{campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
            <Field label="Destino ciudad"><input value={draft.destination_city} onChange={(e) => updateDraft("destination_city", e.target.value)} className={inputClass()} /></Field>
            <Field label="Destino pais"><input value={draft.destination_country} onChange={(e) => updateDraft("destination_country", e.target.value)} className={inputClass()} /></Field>
            <Field label="Mercado objetivo">
              <select value={draft.market_code} onChange={(e) => updateDraft("market_code", e.target.value)} className={inputClass()}>
                <option value="">Sin mercado</option>
                {markets.map((market) => <option key={`draft-market-${market.id}`} value={market.country_code}>{market.country_code} - {market.language_code.toUpperCase()}</option>)}
              </select>
            </Field>
            <Field label="Idioma">
              <input
                value={draft.language_code}
                onChange={(e) => updateDraft("language_code", e.target.value.toLowerCase())}
                className={inputClass()}
                placeholder="es / ja / en"
              />
            </Field>
            <Field label="Estado"><select value={draft.status} onChange={(e) => updateDraft("status", e.target.value as SocialPost["status"])} className={inputClass()}>{SOCIAL_POST_STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}</select></Field>
            <Field label="Programar"><input type="datetime-local" value={toLocalDateTimeInput(draft.scheduled_at)} onChange={(e) => updateDraft("scheduled_at", toIsoFromLocalDateTime(e.target.value))} className={inputClass()} /></Field>
          </div>
          <Field label="Producto de catalogo"><select value={draft.related_catalog_id || ""} onChange={(e) => updateDraft("related_catalog_id", e.target.value || null)} className={inputClass()}><option value="">Sin vinculacion</option>{catalogOptions.map((item) => <option key={item.id} value={item.id}>{item.title || item.id}</option>)}</select></Field>
          <Field label="Hook"><input value={draft.hook} onChange={(e) => updateDraft("hook", e.target.value)} className={inputClass()} /></Field>
          <Field label="Caption"><textarea rows={5} value={draft.caption} onChange={(e) => updateDraft("caption", e.target.value)} className={textareaClass()} /></Field>
          <Field label="Hashtags"><textarea rows={2} value={hashtagsInput} onChange={(e) => setHashtagsInput(e.target.value)} className={textareaClass()} /></Field>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="CTA texto"><input value={draft.cta_text} onChange={(e) => updateDraft("cta_text", e.target.value)} className={inputClass()} /></Field>
            <Field label="CTA URL"><input value={draft.cta_url} onChange={(e) => updateDraft("cta_url", e.target.value)} className={inputClass()} /></Field>
            <Field label="UTM source"><input value={draft.utm_source} onChange={(e) => updateDraft("utm_source", e.target.value)} className={inputClass()} /></Field>
            <Field label="UTM medium"><input value={draft.utm_medium} onChange={(e) => updateDraft("utm_medium", e.target.value)} className={inputClass()} /></Field>
          </div>
          <Field label="UTM campaign"><input value={draft.utm_campaign} onChange={(e) => updateDraft("utm_campaign", e.target.value)} className={inputClass()} /></Field>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Canales</label>
            <div className="flex flex-wrap gap-2">
              {SOCIAL_CHANNELS.map((channel) => {
                const selected = draft.channels.includes(channel);
                return <button key={channel} type="button" onClick={() => updateDraft("channels", selected ? draft.channels.filter((item) => item !== channel) : [...draft.channels, channel])} className={`rounded-full px-3 py-1 text-xs ${selected ? "bg-cyan-600 text-white" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}>{CHANNEL_LABELS[channel]}</button>;
              })}
            </div>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Variantes A/B</h3>
              <div className="flex gap-2">
                <button onClick={onGenerateVariants} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white">Generar A/B</button>
                <button onClick={onSaveVariants} className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white">Guardar variantes</button>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {variants.length === 0 ? <p className="text-xs text-slate-500 dark:text-slate-400">Sin variantes.</p> : variants.map((variant, index) => (
                <div key={variant.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                  <div className="grid gap-2 md:grid-cols-4">
                    <input className={inputClass()} value={variant.variant_label} onChange={(e) => setVariants((current) => { const next = [...current]; next[index] = { ...next[index], variant_label: e.target.value }; return next; })} />
                    <select className={inputClass()} value={variant.channel || ""} onChange={(e) => setVariants((current) => { const next = [...current]; next[index] = { ...next[index], channel: (e.target.value || null) as SocialChannel | null }; return next; })}><option value="">Sin canal</option>{SOCIAL_CHANNELS.map((channel) => <option key={channel} value={channel}>{CHANNEL_LABELS[channel]}</option>)}</select>
                    <input className={inputClass()} value={variant.cta_text || ""} placeholder="CTA" onChange={(e) => setVariants((current) => { const next = [...current]; next[index] = { ...next[index], cta_text: e.target.value }; return next; })} />
                    <input className={inputClass()} value={String(variant.score)} placeholder="Score" onChange={(e) => setVariants((current) => { const next = [...current]; next[index] = { ...next[index], score: Number(e.target.value || 0) }; return next; })} />
                  </div>
                  <input className={`${inputClass()} mt-2`} value={variant.hook || ""} placeholder="Hook" onChange={(e) => setVariants((current) => { const next = [...current]; next[index] = { ...next[index], hook: e.target.value }; return next; })} />
                  <textarea rows={3} className={`${textareaClass()} mt-2`} value={variant.caption || ""} placeholder="Caption" onChange={(e) => setVariants((current) => { const next = [...current]; next[index] = { ...next[index], caption: e.target.value }; return next; })} />
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Assets library</h3>
            <div className="mt-2 grid gap-2 md:grid-cols-3">
              <input className={inputClass()} placeholder="Titulo" value={assetTitle} onChange={(e) => setAssetTitle(e.target.value)} />
              <input className={inputClass()} placeholder="https://..." value={assetUrl} onChange={(e) => setAssetUrl(e.target.value)} />
              <input className={inputClass()} placeholder="Tags destino" value={assetTags} onChange={(e) => setAssetTags(e.target.value)} />
            </div>
            <div className="mt-2 flex justify-end"><button onClick={onSaveAsset} className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white"><Upload className="h-3.5 w-3.5" />Guardar asset</button></div>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {assets.slice(0, 8).map((asset) => (
                <div key={asset.id} className="rounded-xl border border-slate-200 p-2 dark:border-slate-700">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">{asset.title}</p>
                  <p className="line-clamp-1 text-[11px] text-slate-500 dark:text-slate-400">{asset.asset_url}</p>
                  <button onClick={() => attachAsset(asset)} className="mt-2 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-100">Adjuntar</button>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">IA imagen por canal</h3>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Preview referencial por query turistica</span>
            </div>
            {imageDirections.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Genera imagenes por canal para obtener prompt, ratio y referencia visual.
              </p>
            ) : (
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {imageDirections.map((direction) => (
                  <article key={`${direction.channel}-${direction.query}`} className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                    <img src={direction.preview_url} alt={direction.alt_text} className="h-36 w-full object-cover" loading="lazy" />
                    <div className="space-y-2 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-700 dark:text-slate-200">{CHANNEL_LABELS[direction.channel]}</p>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">{direction.aspect_ratio}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300">{direction.visual_style}</p>
                      <p className="line-clamp-3 text-[11px] text-slate-500 dark:text-slate-400">{direction.prompt}</p>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => onUseGeneratedImage(direction)} className="rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white">Usar en pieza</button>
                        <button onClick={() => onSaveGeneratedImageAsAsset(direction)} disabled={savingImageAssetId === `${direction.channel}-${direction.query}`} className="rounded-lg bg-cyan-600 px-2.5 py-1 text-[11px] font-semibold text-white disabled:opacity-60">
                          {savingImageAssetId === `${direction.channel}-${direction.query}` ? "Guardando..." : "Guardar asset"}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Templates por producto</h3>
            <div className="mt-2 grid gap-2 md:grid-cols-3">
              <input className={inputClass()} placeholder="Nombre template" value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
              <input className={inputClass()} placeholder="Tipo producto" value={templateProductType} onChange={(e) => setTemplateProductType(e.target.value)} />
              <button onClick={onSaveTemplate} className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white">Guardar template</button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">{templates.map((template) => <button key={template.id} onClick={() => applyTemplate(template)} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-100">{template.name}</button>)}</div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Sync y logs</h3>
              <div className="flex gap-2">
                <button onClick={() => onSync("synced")} disabled={syncing || !draft.id} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60"><CheckCircle2 className="h-3.5 w-3.5" />Sync OK</button>
                <button onClick={() => onSync("failed")} disabled={syncing || !draft.id} className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60"><AlertTriangle className="h-3.5 w-3.5" />Sync FAIL</button>
              </div>
            </div>
            <div className="mt-2 max-h-40 space-y-2 overflow-y-auto">
              {publishLogs.length === 0 ? <p className="text-xs text-slate-500 dark:text-slate-400">Sin eventos.</p> : publishLogs.map((log) => <div key={log.id} className="rounded-xl border border-slate-200 p-2 text-xs dark:border-slate-700"><p className="font-semibold text-slate-700 dark:text-slate-100">{log.status.toUpperCase()} - {log.provider || "manual"}</p><p className="text-slate-500 dark:text-slate-400">{log.message || "Sin mensaje"} - {toLocalDateTimeInput(log.created_at)}</p></div>)}
            </div>
          </section>
        </div>
      </section>

      <section className="rounded-3xl border border-white/60 bg-white/85 p-5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/75">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Growth y automatizacion</h3>
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Dashboard ejecutivo</p>
            {executive ? (
              <div className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                <p>Pipeline: <b>{executive.pipeline}</b> | Publicadas: <b>{executive.published}</b></p>
                <p>Leads: <b>{executive.leads}</b> | Hot: <b>{executive.hot_leads}</b></p>
                <p>CTR prom: <b>{executive.avg_ctr.toFixed(2)}%</b> | CPL prom: <b>{executive.avg_cpl.toFixed(2)} EUR</b></p>
                <p>Top canal: <b>{executive.top_channel || "n/a"}</b></p>
                <p className="rounded-lg bg-slate-100 p-2 dark:bg-slate-800">{executive.recommendation}</p>
              </div>
            ) : <p className="mt-2 text-xs text-slate-500">Sin resumen disponible.</p>}
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">UTM governance</p>
            <div className="mt-2 grid gap-2">
              <input className={inputClass()} value={utmSource} onChange={(e) => setUtmSource(e.target.value)} placeholder="source" />
              <input className={inputClass()} value={utmMedium} onChange={(e) => setUtmMedium(e.target.value)} placeholder="medium" />
              <input className={inputClass()} value={utmPrefix} onChange={(e) => setUtmPrefix(e.target.value)} placeholder="campaign prefix" />
              <button onClick={onSaveUtmGovernance} className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white">Guardar UTM</button>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">Reglas activas: {utmRules.length}</p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Brand safety</p>
            <textarea className={textareaClass()} rows={2} value={blockedTermsInput} onChange={(e) => setBlockedTermsInput(e.target.value)} placeholder="Terminos bloqueados, separados por coma" />
            <textarea className={`${textareaClass()} mt-2`} rows={2} value={requiredTermsInput} onChange={(e) => setRequiredTermsInput(e.target.value)} placeholder="Terminos requeridos, separados por coma" />
            <button onClick={onSaveBrandSafety} className="mt-2 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white">Guardar reglas</button>
            <p className="mt-2 text-[11px] text-slate-500">Estado post: {posts.find((p) => p.id === draft.id)?.brand_safety_status || "pending"}</p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Localizacion multi-idioma</p>
            <input className={inputClass()} value={localizationTargets} onChange={(e) => setLocalizationTargets(e.target.value)} placeholder="en-US,pt-BR,it-IT" />
            <button onClick={onGenerateLocalizations} className="mt-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white">Generar localizaciones</button>
            <div className="mt-2 max-h-28 space-y-1 overflow-y-auto text-[11px] text-slate-600 dark:text-slate-300">
              {localizations.length === 0 ? <p>Sin localizaciones</p> : localizations.map((item) => <p key={item.id}>{item.language_code}{item.market_code ? `-${item.market_code}` : ""}: {item.localized_title}</p>)}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Hook library + mejor hora</p>
            <input className={inputClass()} value={newHookText} onChange={(e) => setNewHookText(e.target.value)} placeholder="Nuevo hook" />
            <button onClick={onAddHookLibrary} className="mt-2 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white">Guardar hook</button>
            <p className="mt-2 text-[11px] text-slate-500">Hooks: {hookLibrary.length}</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {postingWindows.slice(0, 3).map((slot) => <span key={slot.id} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] dark:bg-slate-800">{CHANNEL_LABELS[slot.channel]} d{slot.weekday} {slot.hour}:00 ({slot.score.toFixed(2)})</span>)}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Auto-brief y campana 360</p>
            <button onClick={onCreateBriefFromCatalog} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white">Generar brief catalogo</button>
            <div className="mt-2 grid gap-2">
              <input className={inputClass()} value={playbookName} onChange={(e) => setPlaybookName(e.target.value)} placeholder="Nombre playbook" />
              <input className={inputClass()} value={playbookObjective} onChange={(e) => setPlaybookObjective(e.target.value)} placeholder="Objetivo" />
              <input className={inputClass()} value={playbookAudience} onChange={(e) => setPlaybookAudience(e.target.value)} placeholder="Audiencia" />
              <button onClick={onCreatePlaybook360} className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white">Generar playbook 360</button>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">Briefs: {briefs.length} | Playbooks: {playbooks.length}</p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900 lg:col-span-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Google Ads + Facebook Ads</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={onGeneratePaidAds}
                  disabled={generatingAds}
                  className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {generatingAds ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  Generar anuncios
                </button>
                <button
                  onClick={onSavePaidAdsAsVariants}
                  disabled={savingAdsVariants || !paidAdsSuggestion || !draft.id}
                  className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {savingAdsVariants ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Guardar como variantes
                </button>
              </div>
            </div>

            {paidAdsSuggestion ? (
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">Google Ads</p>
                  <p className="mt-1 text-[11px] text-slate-500">URL final: {paidAdsSuggestion.google.final_url}</p>
                  <p className="mt-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300">Headlines</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {paidAdsSuggestion.google.headlines.map((item, idx) => (
                      <span key={`google-headline-${idx}`} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] dark:bg-slate-800">
                        {item}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300">Descriptions</p>
                  <div className="mt-1 space-y-1">
                    {paidAdsSuggestion.google.descriptions.map((item, idx) => (
                      <p key={`google-description-${idx}`} className="text-[11px] text-slate-600 dark:text-slate-300">{item}</p>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500">
                    Paths: /{paidAdsSuggestion.google.path1}/{paidAdsSuggestion.google.path2}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">Facebook Ads</p>
                  <p className="mt-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300">Primary text</p>
                  <div className="mt-1 space-y-1">
                    {paidAdsSuggestion.facebook.primary_texts.map((item, idx) => (
                      <p key={`facebook-primary-${idx}`} className="text-[11px] text-slate-600 dark:text-slate-300">{item}</p>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300">Headlines</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {paidAdsSuggestion.facebook.headlines.map((item, idx) => (
                      <span key={`facebook-headline-${idx}`} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] dark:bg-slate-800">
                        {item}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300">CTA sugeridos</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {paidAdsSuggestion.facebook.cta_texts.map((item, idx) => (
                      <span key={`facebook-cta-${idx}`} className="rounded-full bg-cyan-50 px-2 py-0.5 text-[10px] text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Genera anuncios para obtener copies de Google Ads y Facebook Ads segun el mercado e idioma activo.
              </p>
            )}
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900 lg:col-span-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Inbox comentarios y lead scoring</p>
            <div className="mt-2 grid gap-3 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-2 dark:border-slate-700">
                <div className="flex gap-2">
                  <input className={inputClass()} value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Nuevo comentario inbound" />
                  <button onClick={onCreateInboxComment} className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white">Agregar</button>
                </div>
                <div className="mt-2 max-h-32 space-y-1 overflow-y-auto text-[11px] text-slate-600 dark:text-slate-300">
                  {commentsInbox.length === 0 ? <p>Sin comentarios</p> : commentsInbox.slice(0, 8).map((item) => <p key={item.id}>[{item.priority}] {item.author_handle || "anon"}: {item.content}</p>)}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 p-2 dark:border-slate-700">
                <div className="grid gap-2 md:grid-cols-4">
                  <input className={inputClass()} value={newLeadName} onChange={(e) => setNewLeadName(e.target.value)} placeholder="Nombre" />
                  <input className={inputClass()} value={newLeadEmail} onChange={(e) => setNewLeadEmail(e.target.value)} placeholder="Email" />
                  <input className={inputClass()} value={newLeadBudget} onChange={(e) => setNewLeadBudget(e.target.value)} placeholder="Budget" />
                  <button onClick={onCreateLead} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white">Crear lead</button>
                </div>
                <div className="mt-2 max-h-32 space-y-1 overflow-y-auto text-[11px] text-slate-600 dark:text-slate-300">
                  {leads.length === 0 ? <p>Sin leads</p> : leads.slice(0, 8).map((lead) => <p key={lead.id}>{lead.contact_name || lead.contact_email || "Lead"} - score {lead.score} ({lead.temperature})</p>)}
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>

      {openCampaignModal ? (
        <SimpleModal title="Nueva campana" onClose={() => setOpenCampaignModal(false)}>
          <div className="space-y-3">
            <input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} className={inputClass()} placeholder="Nombre campana" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setOpenCampaignModal(false)} className="rounded-xl bg-slate-200 px-4 py-2 text-sm dark:bg-slate-800">Cancelar</button>
              <button onClick={onSaveCampaign} className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white">Guardar</button>
            </div>
          </div>
        </SimpleModal>
      ) : null}

      {openAccountModal ? (
        <SimpleModal title="Vincular canal" onClose={() => setOpenAccountModal(false)}>
          <div className="space-y-3">
            <select value={accountChannel} onChange={(e) => setAccountChannel(e.target.value as SocialChannel)} className={inputClass()}>
              {SOCIAL_CHANNELS.map((channel) => <option key={channel} value={channel}>{CHANNEL_LABELS[channel]}</option>)}
            </select>
            <input value={accountHandle} onChange={(e) => setAccountHandle(e.target.value)} className={inputClass()} placeholder="@collaviajes" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setOpenAccountModal(false)} className="rounded-xl bg-slate-200 px-4 py-2 text-sm dark:bg-slate-800">Cancelar</button>
              <button onClick={onSaveAccount} className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white">Guardar</button>
            </div>
          </div>
        </SimpleModal>
      ) : null}

      <section className="rounded-3xl border border-white/60 bg-white/85 p-5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/75">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Canales conectados</h3>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {accounts.length === 0 ? <p className="text-sm text-slate-500 dark:text-slate-300">Sin cuentas conectadas.</p> : accounts.map((account) => <div key={account.id} className="rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-900"><p className="font-medium text-slate-900 dark:text-slate-100">{CHANNEL_LABELS[account.channel]}</p><p className="text-xs text-slate-500 dark:text-slate-400">{account.handle}</p></div>)}
        </div>
        {context ? <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">Brain activo para copy: {context.brain?.name || "Sin brain asignado"} | Mercado: {context.marketCode || context.countryCode || "n/a"} ({context.languageCode.toUpperCase()}) | Agencia: {context.agencyName}</p> : null}
      </section>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function SimpleModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-3xl border border-white/20 bg-white/95 p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h4>
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">Cerrar</button>
        </div>
        {children}
      </div>
    </div>
  );
}
