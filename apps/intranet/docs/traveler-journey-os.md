# Traveler Journey OS

## Vision
Traveler stops being a simple chat page and becomes a complete sales and service workspace:

1. Explore
2. Design
3. Decide
4. Reserve
5. Travel and support

The user keeps one continuous context while moving across chat, planning, quote, payment, and post-booking support.

## Product concept
- One persistent journey state shared across all traveler pages.
- AI answers are not isolated; they operate with agency, market, catalog, and journey-stage context.
- Every interaction should move the user to a concrete next commercial action.

## UX architecture

### Left rail
- Journey navigation (`Hub`, `Chat`, `Planning`).
- Current stage and reservation status.
- Session history.

### Center workspace
- Conversational AI (chat) for discovery and qualification.
- Dynamic planning forms for structured product definition.

### Right operations panel
- Commercial radar (intent + confidence + next stage).
- Destination map context.
- Suggested products and product focus.
- Collaboration (companions/advisor).
- Quote and reservation actions.
- Post-booking support cases.

## Data model (implemented in app state)

### Journey state
- `activeStage`: `explore | design | decide | booked | traveling`
- `selectedProductId`
- `selectedDestination`
- `collaborators[]`
- `reservation`
- `supportCases[]`
- `checklist`

### Reservation state
- `status`: `draft | quoted | pending_payment | confirmed`
- quote items, subtotal, currency, payment link

### Support state
- case type: `change_request | incident | billing | general`
- status: `open | in_progress | resolved`

## Persistence strategy
- Current implementation: local persistence (`localStorage`) in traveler workspace context.
- Chat sessions/messages continue in Supabase tables already used.
- Next step: move journey, quotes, collaborators, support to persistent Supabase tables.

## Backend roadmap
- Add dedicated tables for:
  - `traveler_journeys`
  - `traveler_journey_collaborators`
  - `traveler_journey_quotes`
  - `traveler_journey_quote_items`
  - `traveler_support_cases`
- Add RLS by `traveler_id` and tenant/agency ownership.
- Add API endpoints for quote lifecycle and support workflow.

## Commercial flow logic
- Intent scoring from conversation drives stage promotion:
  - low -> explore
  - medium -> design
  - high -> decide
- Quote creation moves journey to `decide`.
- Reservation confirmation moves journey to `booked`.
- Support case after booking promotes to `traveling`.

## What is already implemented in this iteration
- Unified journey state context with persistence.
- Product focus from catalog into chat (`/traveler/chat?product=...`).
- Shared operations sidebar for chat and planning:
  - map context
  - collaborators
  - quote/reservation controls
  - support cases
- Event tracking expanded for commercial operations.

## Next implementation milestones
1. Persist journey entities in Supabase (replace local-only state).
2. Real payment integration and booking confirmation webhook.
3. Real destination map layers (route, POI, stay, activities).
4. Collaboration invites via email and role permissions.
5. SLA-based support queue and agent handoff in intranet.
