# File by file review

Generated at: 2026-03-13T09:42:02.676Z

| File | Type | Role | Note |
| --- | --- | --- | --- |
| `apps/intranet/src/app/api/admin/invite-user/route.ts` | API route | Endpoint admin/invite-user | isCoreAdmin, |
| `apps/intranet/src/app/api/ai/chat/route.ts` | API route | Endpoint ai/chat | - |
| `apps/intranet/src/app/api/brains/[brainId]/route.ts` | API route | Endpoint brains/[brainId] | const GEMINI_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY!; |
| `apps/intranet/src/app/api/catalog/upload-image/route.ts` | API route | Endpoint catalog/upload-image | canAccessAgency, |
| `apps/intranet/src/app/api/chat/route.ts` | API route | Endpoint chat | /api/chat |
| `apps/intranet/src/app/api/debug/list-models/route.ts` | API route | Endpoint debug/list-models | return Response.json( |
| `apps/intranet/src/app/api/product-types/[typeId]/fields/route.ts` | API route | Endpoint product-types/[typeId]/fields | function bad(message: string, status = 400) { |
| `apps/intranet/src/app/intranet/agency/[id]/ag_team/page.tsx` | Page | UI screen entrypoint | "use client"; |
| `apps/intranet/src/app/intranet/agency/[id]/ag_tools/catalog/page.tsx` | Page | UI screen entrypoint | params, |
| `apps/intranet/src/app/intranet/agency/[id]/ag_tools/catalogia/page.tsx` | Page | UI screen entrypoint | /src/app/[id]/catalog-ia/page.tsx |
| `apps/intranet/src/app/intranet/agency/[id]/ag_tools/page.tsx` | Page | UI screen entrypoint | params, |
| `apps/intranet/src/app/intranet/agency/[id]/layout.tsx` | Layout | Shared page shell | "use client"; |
| `apps/intranet/src/app/intranet/agency/[id]/page.tsx` | Page | UI screen entrypoint | "use client"; |
| `apps/intranet/src/app/intranet/agency/[id]/profile/AgencyProfile.tsx` | Module | Agency Profile | 'use client'; |
| `apps/intranet/src/app/intranet/agency/[id]/profile/page.tsx` | Page | UI screen entrypoint | params, |
| `apps/intranet/src/app/intranet/agency/[id]/registered-travelers/page.tsx` | Page | UI screen entrypoint | return <AgencyTravelersList />; |
| `apps/intranet/src/app/intranet/agency/[id]/registered-travelers/TravelerCard.tsx` | Module | Traveler Card | traveler, |
| `apps/intranet/src/app/intranet/agency/[id]/registered-travelers/TravelerDetailPanel.tsx` | Module | Traveler Detail Panel | const traveler = data.traveler; |
| `apps/intranet/src/app/intranet/agency/[id]/registered-travelers/TravelerFormModal.tsx` | Module | Traveler Form Modal | 'use client'; |
| `apps/intranet/src/app/intranet/agency/[id]/registered-travelers/TravelersList.tsx` | Module | Travelers List | "use client"; |
| `apps/intranet/src/app/intranet/agency/[id]/registered-travelers/types.ts` | Module | types | - |
| `apps/intranet/src/app/intranet/auth/activate/page.tsx` | Page | UI screen entrypoint | "use client"; |
| `apps/intranet/src/app/intranet/layout.tsx` | Layout | Shared page shell | "use client"; |
| `apps/intranet/src/app/intranet/login/layout.tsx` | Layout | Shared page shell | return <div className="intranet-wrapper">{children}</div>; |
| `apps/intranet/src/app/intranet/login/page.tsx` | Page | UI screen entrypoint | "use client"; |
| `apps/intranet/src/app/intranet/login/template.tsx` | Module | template | "use client"; |
| `apps/intranet/src/app/intranet/logout/route.ts` | Module | Endpoint apps/intranet/src/app/intranet/logout | const supabase = await createSupabaseServer(); |
| `apps/intranet/src/app/intranet/page.tsx` | Page | UI screen entrypoint | const supabase = await createSupabaseServer(); |
| `apps/intranet/src/app/intranet/thecore/catalog/page.tsx` | Page | UI screen entrypoint | return <CatalogManager mode="theocore" />; |
| `apps/intranet/src/app/intranet/thecore/globalteam/page.tsx` | Page | UI screen entrypoint | "use client"; |
| `apps/intranet/src/app/intranet/thecore/globaltravelers/GlobalTravelerFormModal.tsx` | Module | Global Traveler Form Modal | 'use client'; |
| `apps/intranet/src/app/intranet/thecore/globaltravelers/GlobalTravelerPanel.tsx` | Module | Global Traveler Panel | return ( |
| `apps/intranet/src/app/intranet/thecore/globaltravelers/GlobalTravelersList.tsx` | Module | Global Travelers List | 'use client'; |
| `apps/intranet/src/app/intranet/thecore/globaltravelers/page.tsx` | Page | UI screen entrypoint | "use client"; |
| `apps/intranet/src/app/intranet/thecore/layout.tsx` | Layout | Shared page shell | "use client"; |
| `apps/intranet/src/app/intranet/thecore/page.tsx` | Page | UI screen entrypoint | "use client"; |
| `apps/intranet/src/app/intranet/thecore/setting/agencias/page.tsx` | Page | UI screen entrypoint | "use client"; |
| `apps/intranet/src/app/intranet/thecore/setting/amenities/page.tsx` | Page | UI screen entrypoint | "use client"; |
| `apps/intranet/src/app/intranet/thecore/setting/brain/page.tsx` | Page | UI screen entrypoint | "use client"; |
| `apps/intranet/src/app/intranet/thecore/setting/menues/page.tsx` | Page | UI screen entrypoint | "use client"; |
| `apps/intranet/src/app/intranet/thecore/setting/page.tsx` | Page | UI screen entrypoint | "use client"; |
| `apps/intranet/src/app/intranet/thecore/setting/productos/page.tsx` | Page | UI screen entrypoint | "use client"; |
| `apps/intranet/src/app/layout.tsx` | Layout | Shared page shell | const geistSans = Geist({ |
| `apps/intranet/src/app/page.tsx` | Page | UI screen entrypoint | "use client"; |
| `apps/intranet/src/app/providers.tsx` | Module | providers | "use client"; |
| `apps/intranet/src/components/igma/ImageWithFallback.tsx` | Component | Image With Fallback | const ERROR_IMG_SRC = |
| `apps/intranet/src/components/intracore/AgencyProfileSummaryModal.tsx` | Component | Agency Profile Summary Modal | "use client"; |
| `apps/intranet/src/components/intracore/AgencyQuickViewModal.tsx` | Component | Agency Quick View Modal | "use client"; |
| `apps/intranet/src/components/intracore/AgencyToolsPanel.tsx` | Component | Agency Tools Panel | "use client"; |
| `apps/intranet/src/components/intracore/CrudPageShell.tsx` | Component | Crud Page Shell | "use client"; |
| `apps/intranet/src/components/intracore/Header.tsx` | Component | Header | "use client"; |
| `apps/intranet/src/components/intracore/NavigationCards.tsx` | Component | Navigation Cards | "use client"; |
| `apps/intranet/src/components/intracore/PageLoader.tsx` | Component | Page Loader | "use client"; |
| `apps/intranet/src/components/intracore/UserMenu.tsx` | Component | User Menu | "use client"; |
| `apps/intranet/src/components/modals/ConfirmDialog.tsx` | Component | Confirm Dialog | "use client"; |
| `apps/intranet/src/components/modals/UserEditModal.tsx` | Component | User Edit Modal | "use client"; |
| `apps/intranet/src/components/modals/UserFormModal.tsx` | Component | User Form Modal | "use client"; |
| `apps/intranet/src/components/system/EntityWorkspace.tsx` | Component | Entity Workspace | "use client"; |
| `apps/intranet/src/components/system/ModalShell.tsx` | Component | Modal Shell | "use client"; |
| `apps/intranet/src/components/system/ToastProvider.tsx` | Component | Toast Provider | "use client"; |
| `apps/intranet/src/components/traveler/AuthModal.tsx` | Component | Auth Modal | "use client"; |
| `apps/intranet/src/components/traveler/LoggedInView.tsx` | Component | Logged In View | "use client"; |
| `apps/intranet/src/components/traveler/LoggedOutView.tsx` | Component | Logged Out View | "use client"; |
| `apps/intranet/src/components/ui/Modal.tsx` | Component | Modal | 'use client' |
| `apps/intranet/src/contexts/page.tsx` | Page | UI screen entrypoint | "use client"; |
| `apps/intranet/src/contexts/tenant.tsx` | Module | tenant | "use client"; |
| `apps/intranet/src/contexts/traveler-catalog.tsx` | Module | traveler catalog | "use client"; |
| `apps/intranet/src/features/agencies/dashboard.ts` | Feature module | dashboard | legalName: string \| null; |
| `apps/intranet/src/features/agency-tools/api.ts` | Feature module | api | id: string; |
| `apps/intranet/src/features/catalog/api.ts` | Feature module | api | CatalogAgency, |
| `apps/intranet/src/features/catalog/CatalogFormModal.tsx` | Feature module | Catalog Form Modal | "use client"; |
| `apps/intranet/src/features/catalog/CatalogManager.tsx` | Feature module | Catalog Manager | "use client"; |
| `apps/intranet/src/features/catalog/CatalogQuickViewModal.tsx` | Feature module | Catalog Quick View Modal | "use client"; |
| `apps/intranet/src/features/catalog/types.ts` | Feature module | types | id: string; |
| `apps/intranet/src/features/travelers/api.ts` | Feature module | api | type TravelerLinkRow = { |
| `apps/intranet/src/features/travelers/types.ts` | Feature module | types | id: string; |
| `apps/intranet/src/hooks/theocore/useGlobalAgencies.ts` | Module | use Global Agencies | "use client"; |
| `apps/intranet/src/hooks/theocore/useGlobalTeam.ts` | Module | use Global Team | "use client"; |
| `apps/intranet/src/hooks/theocore/useGlobalTravelers.ts` | Module | use Global Travelers | "use client"; |
| `apps/intranet/src/lib/agency-tools-registry.ts` | Library | agency tools registry | toolKey: string; |
| `apps/intranet/src/lib/api/auth.ts` | Library | auth | getRequestIp, |
| `apps/intranet/src/lib/catalog/travelers.ts` | Library | travelers | id: string; |
| `apps/intranet/src/lib/chat/structured.ts` | Library | structured | role: ChatMessageRole; |
| `apps/intranet/src/lib/mobile/local-notifications.ts` | Library | local notifications | const TEST_NOTIFICATION_ID = 9010; |
| `apps/intranet/src/lib/routes.ts` | Library | routes | return path ? `${THEOCORE_HOME}/${path}` : THEOCORE_HOME; |
| `apps/intranet/src/lib/supabase/client.ts` | Library | client | function createSupabaseBrowserClient() { |
| `apps/intranet/src/lib/supabase/env.ts` | Library | env | function requirePublicEnv(value: string \| undefined, name: string) { |
| `apps/intranet/src/lib/supabase/server.ts` | Library | server | getSupabaseAnonKey, |
| `apps/intranet/src/lib/tenant/presentation.ts` | Library | presentation | const DEFAULT_PRIMARY = "#2563eb"; |
| `apps/intranet/src/lib/tenant/server.ts` | Library | server | type AgencyDomainRow = { |
| `apps/intranet/src/lib/tenant/types.ts` | Library | types | id: string; |
| `apps/intranet/src/lib/traveler/insights.ts` | Library | insights | intent: IntentLevel; |
| `apps/intranet/src/lib/traveler/preferences.ts` | Library | preferences | aiPersonalization: boolean; |
| `apps/intranet/src/lib/traveler/tracking.ts` | Library | tracking | "use client"; |
| `apps/intranet/src/lib/utils.ts` | Library | utils | return twMerge(clsx(inputs)) |
| `apps/intranet/src/lib/utils/csv.ts` | Library | csv | const text = value == null ? "" : String(value); |
| `apps/intranet/src/lib/validation/theocore.ts` | Library | theocore | function hasValue(value: string \| null \| undefined) { |
| `apps/intranet/src/proxy.ts` | Proxy | Request gate + redirects | function isIntranetPath(pathname: string) { |
| `apps/traveler/src/app/api/admin/invite-user/route.ts` | API route | Endpoint admin/invite-user | isCoreAdmin, |
| `apps/traveler/src/app/api/ai/chat/route.ts` | API route | Endpoint ai/chat | - |
| `apps/traveler/src/app/api/brains/[brainId]/route.ts` | API route | Endpoint brains/[brainId] | const GEMINI_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY!; |
| `apps/traveler/src/app/api/catalog/upload-image/route.ts` | API route | Endpoint catalog/upload-image | canAccessAgency, |
| `apps/traveler/src/app/api/chat/route.ts` | API route | Endpoint chat | /api/chat |
| `apps/traveler/src/app/api/debug/list-models/route.ts` | API route | Endpoint debug/list-models | return Response.json( |
| `apps/traveler/src/app/api/product-types/[typeId]/fields/route.ts` | API route | Endpoint product-types/[typeId]/fields | function bad(message: string, status = 400) { |
| `apps/traveler/src/app/layout.tsx` | Layout | Shared page shell | const geistSans = Geist({ |
| `apps/traveler/src/app/page.tsx` | Page | UI screen entrypoint | "use client"; |
| `apps/traveler/src/app/providers.tsx` | Module | providers | "use client"; |
| `apps/traveler/src/app/traveler/AuthContext.tsx` | Module | Auth Context | src/app/traveler/AuthContext.tsx |
| `apps/traveler/src/app/traveler/bookings/page.tsx` | Page | UI screen entrypoint | "use client"; |
| `apps/traveler/src/app/traveler/chat/ChatColumn.tsx` | Module | Chat Column | interface ChatColumnProps { |
| `apps/traveler/src/app/traveler/chat/ChatRightSidebar.tsx` | Module | Chat Right Sidebar | src/app/traveler/chat/ChatRightSidebar.tsx |
| `apps/traveler/src/app/traveler/chat/page.tsx` | Page | UI screen entrypoint | "use client"; |
| `apps/traveler/src/app/traveler/chat/types-and-utils.ts` | Module | types and utils | id: string; |
| `apps/traveler/src/app/traveler/favorites/page.tsx` | Page | UI screen entrypoint | "use client"; |
| `apps/traveler/src/app/traveler/JourneyHistoryMini.tsx` | Module | Journey History Mini | "use client"; |
| `apps/traveler/src/app/traveler/layout.tsx` | Layout | Shared page shell | "use client"; |
| `apps/traveler/src/app/traveler/LeftSidebar.tsx` | Module | Left Sidebar | "use client"; |
| `apps/traveler/src/app/traveler/page.tsx` | Page | UI screen entrypoint | "use client"; |
| `apps/traveler/src/app/traveler/planning/page.tsx` | Page | UI screen entrypoint | "use client"; |
| `apps/traveler/src/app/traveler/planning/PlanColumn.tsx` | Module | Plan Column | type PlanColumnProps = { |
| `apps/traveler/src/app/traveler/planning/PlanRightSidebar.tsx` | Module | Plan Right Sidebar | src/app/traveler/planning/PlanRightSidebar.tsx |
| `apps/traveler/src/app/traveler/planning/types-and-utils.ts` | Module | types and utils | id: string; |
| `apps/traveler/src/app/traveler/preferences/page.tsx` | Page | UI screen entrypoint | "use client"; |
| `apps/traveler/src/app/traveler/profile/page.tsx` | Page | UI screen entrypoint | "use client"; |
| `apps/traveler/src/app/traveler/RightWelcome.tsx` | Module | Right Welcome | src/app/traveler/RightWelcome.tsx |
| `apps/traveler/src/app/traveler/TravelerJourneyTopBar.tsx` | Module | Traveler Journey Top Bar | "use client"; |
| `apps/traveler/src/app/traveler/TravelerSalesSidebar.tsx` | Module | Traveler Sales Sidebar | "use client"; |
| `apps/traveler/src/app/traveler/TravelerStartWizard.tsx` | Module | Traveler Start Wizard | "use client"; |
| `apps/traveler/src/app/traveler/TravelerWorkspaceContext.tsx` | Module | Traveler Workspace Context | "use client"; |
| `apps/traveler/src/app/traveler/TravelerWorkspaceLayout.tsx` | Module | Traveler Workspace Layout | "use client"; |
| `apps/traveler/src/app/traveler/useTravelerPreferences.ts` | Module | use Traveler Preferences | "use client"; |
| `apps/traveler/src/app/traveler/WelcomePanel.tsx` | Module | Welcome Panel | "use client"; |
| `apps/traveler/src/components/igma/ImageWithFallback.tsx` | Component | Image With Fallback | const ERROR_IMG_SRC = |
| `apps/traveler/src/components/intracore/AgencyProfileSummaryModal.tsx` | Component | Agency Profile Summary Modal | "use client"; |
| `apps/traveler/src/components/intracore/AgencyQuickViewModal.tsx` | Component | Agency Quick View Modal | "use client"; |
| `apps/traveler/src/components/intracore/AgencyToolsPanel.tsx` | Component | Agency Tools Panel | "use client"; |
| `apps/traveler/src/components/intracore/CrudPageShell.tsx` | Component | Crud Page Shell | "use client"; |
| `apps/traveler/src/components/intracore/Header.tsx` | Component | Header | "use client"; |
| `apps/traveler/src/components/intracore/NavigationCards.tsx` | Component | Navigation Cards | "use client"; |
| `apps/traveler/src/components/intracore/PageLoader.tsx` | Component | Page Loader | "use client"; |
| `apps/traveler/src/components/intracore/UserMenu.tsx` | Component | User Menu | "use client"; |
| `apps/traveler/src/components/modals/ConfirmDialog.tsx` | Component | Confirm Dialog | "use client"; |
| `apps/traveler/src/components/modals/UserEditModal.tsx` | Component | User Edit Modal | "use client"; |
| `apps/traveler/src/components/modals/UserFormModal.tsx` | Component | User Form Modal | "use client"; |
| `apps/traveler/src/components/system/EntityWorkspace.tsx` | Component | Entity Workspace | "use client"; |
| `apps/traveler/src/components/system/ModalShell.tsx` | Component | Modal Shell | "use client"; |
| `apps/traveler/src/components/system/ToastProvider.tsx` | Component | Toast Provider | "use client"; |
| `apps/traveler/src/components/traveler/AuthModal.tsx` | Component | Auth Modal | "use client"; |
| `apps/traveler/src/components/traveler/LoggedInView.tsx` | Component | Logged In View | "use client"; |
| `apps/traveler/src/components/traveler/LoggedOutView.tsx` | Component | Logged Out View | "use client"; |
| `apps/traveler/src/components/ui/Modal.tsx` | Component | Modal | 'use client' |
| `apps/traveler/src/contexts/page.tsx` | Page | UI screen entrypoint | "use client"; |
| `apps/traveler/src/contexts/tenant.tsx` | Module | tenant | "use client"; |
| `apps/traveler/src/contexts/traveler-catalog.tsx` | Module | traveler catalog | "use client"; |
| `apps/traveler/src/features/agencies/dashboard.ts` | Feature module | dashboard | legalName: string \| null; |
| `apps/traveler/src/features/agency-tools/api.ts` | Feature module | api | id: string; |
| `apps/traveler/src/features/catalog/api.ts` | Feature module | api | CatalogAgency, |
| `apps/traveler/src/features/catalog/CatalogFormModal.tsx` | Feature module | Catalog Form Modal | "use client"; |
| `apps/traveler/src/features/catalog/CatalogManager.tsx` | Feature module | Catalog Manager | "use client"; |
| `apps/traveler/src/features/catalog/CatalogQuickViewModal.tsx` | Feature module | Catalog Quick View Modal | "use client"; |
| `apps/traveler/src/features/catalog/types.ts` | Feature module | types | id: string; |
| `apps/traveler/src/features/travelers/api.ts` | Feature module | api | type TravelerLinkRow = { |
| `apps/traveler/src/features/travelers/types.ts` | Feature module | types | id: string; |
| `apps/traveler/src/hooks/theocore/useGlobalAgencies.ts` | Module | use Global Agencies | "use client"; |
| `apps/traveler/src/hooks/theocore/useGlobalTeam.ts` | Module | use Global Team | "use client"; |
| `apps/traveler/src/hooks/theocore/useGlobalTravelers.ts` | Module | use Global Travelers | "use client"; |
| `apps/traveler/src/lib/agency-tools-registry.ts` | Library | agency tools registry | toolKey: string; |
| `apps/traveler/src/lib/api/auth.ts` | Library | auth | getRequestIp, |
| `apps/traveler/src/lib/catalog/travelers.ts` | Library | travelers | id: string; |
| `apps/traveler/src/lib/chat/structured.ts` | Library | structured | role: ChatMessageRole; |
| `apps/traveler/src/lib/mobile/local-notifications.ts` | Library | local notifications | const TEST_NOTIFICATION_ID = 9010; |
| `apps/traveler/src/lib/routes.ts` | Library | routes | return path ? `${THEOCORE_HOME}/${path}` : THEOCORE_HOME; |
| `apps/traveler/src/lib/supabase/client.ts` | Library | client | function createSupabaseBrowserClient() { |
| `apps/traveler/src/lib/supabase/env.ts` | Library | env | function requirePublicEnv(value: string \| undefined, name: string) { |
| `apps/traveler/src/lib/supabase/server.ts` | Library | server | getSupabaseAnonKey, |
| `apps/traveler/src/lib/tenant/presentation.ts` | Library | presentation | const DEFAULT_PRIMARY = "#2563eb"; |
| `apps/traveler/src/lib/tenant/server.ts` | Library | server | type AgencyDomainRow = { |
| `apps/traveler/src/lib/tenant/types.ts` | Library | types | id: string; |
| `apps/traveler/src/lib/traveler/insights.ts` | Library | insights | intent: IntentLevel; |
| `apps/traveler/src/lib/traveler/preferences.ts` | Library | preferences | aiPersonalization: boolean; |
| `apps/traveler/src/lib/traveler/tracking.ts` | Library | tracking | "use client"; |
| `apps/traveler/src/lib/utils.ts` | Library | utils | return twMerge(clsx(inputs)) |
| `apps/traveler/src/lib/utils/csv.ts` | Library | csv | const text = value == null ? "" : String(value); |
| `apps/traveler/src/lib/validation/theocore.ts` | Library | theocore | function hasValue(value: string \| null \| undefined) { |
| `apps/traveler/src/proxy.ts` | Proxy | Request gate + redirects | const { pathname } = req.nextUrl; |
| `packages/lib/src/api/auth.ts` | Module | auth | function normalizeIp(rawIp: string \| null) { |
| `packages/lib/src/api/rate-limit.ts` | Module | rate limit | type RateLimitEntry = { |
| `tools/check-text-health.mjs` | Tool script | Operational automation | #!/usr/bin/env node |
| `tools/db-push-all.mjs` | Tool script | Operational automation | #!/usr/bin/env node |
| `tools/generate-file-review.mjs` | Tool script | Operational automation | #!/usr/bin/env node |
| `tools/smoke-test.mjs` | Tool script | Operational automation | const HOST = "127.0.0.1"; |
