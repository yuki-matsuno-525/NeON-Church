# Design improvements implementation progress

Updated: 2026-08-02
Branch: `codex/list-searches-qa-answer`

This is the execution checklist for the full design, UX, accessibility, state-safety,
and permission audit. A checked item must have implementation evidence and a passing
focused test. Phase completion additionally requires the full frontend and backend
test suites, a commit, and a push.

## Status legend

- `[ ]` not started
- `[~]` in progress
- `[x]` implemented and verified
- `[!]` blocked, with the reason recorded below the item

## Phase 0 — Audit coverage and guardrails

- [x] Inventory every App Router page, shared layout, modal, panel, and major component.
- [x] Inspect public production pages at desktop and mobile widths.
- [x] Inspect authenticated production pages with documented seed accounts, read-only.
- [x] Separate work into public/common, community/auth, translations, and articles.
- [x] Read the bundled Next.js 16 accessibility, navigation, forms, error-handling, client-component, and Vitest guidance.
- [x] Use a dedicated worktree and branch; leave `main` untouched.

## Phase 1 — Safety, permissions, and reliable state

- [x] SAFE-01 Prevent article autosave data loss on navigation, reload, and tab close.
- [x] SAFE-02 Prevent translation draft project/detail/unit/summary/comment/read leakage by URL.
- [x] SAFE-03 Separate pending membership from approved membership in API and UI.
- [x] SAFE-04 Protect translation text from unsaved navigation and failed saves.
- [x] SAFE-05 Stop converting API failures into false empty states; retain data and expose retry.
- [x] SAFE-06 Add confirmation, busy, success, and failure states to publish/unpublish/recruit/destructive actions.
- [x] SAFE-07 Prevent review workflow bypass and refresh progress after status changes.
- [x] SAFE-08 Add dirty-form protection to create/edit flows.

## Phase 2 — Shared accessibility and responsive foundations

- [x] CORE-01 Add a skip link and stable main-content target.
- [x] CORE-02 Give navbar search and language controls complete accessible names/states.
- [x] CORE-03 Keep document language synchronized with the selected locale.
- [x] CORE-04 Correct active navigation for every canonical and non-canonical book route.
- [x] CORE-05 Make the mobile sidebar a keyboard-safe modal drawer with focus restoration.
- [x] CORE-06 Upgrade ConfirmDialog, LoginRequiredModal, and session-expired UI to proper dialogs.
- [x] CORE-07 Standardize tabs with tablist/tab/tabpanel semantics and keyboard navigation.
- [x] CORE-08 Raise interactive targets to 44px where practical.
- [x] CORE-09 Raise low-contrast text to WCAG AA and reserve glow for hierarchy/state.
- [x] CORE-10 Standardize loading, empty, error, retry, busy, and live status patterns.
- [x] CORE-11 Add reduced-motion behavior and keyboard-equivalent focus styling.
- [x] CORE-12 Fix footer target sizes and external-link affordances.

## Phase 3 — Home, Bible reading, search, and comments

- [x] READ-01 Link recent Q&A and trends to valid exact destinations.
- [x] READ-02 Preserve home sections during loading/errors and add retry/skeleton/live status.
- [x] READ-03 Group `/read` results by type with counts, URL-synced debounced search, and result announcements.
- [x] READ-04 Distinguish invalid book, empty, loading, and API error states.
- [x] READ-05 Give chapter links descriptive names, progress context, and source/license attribution.
- [x] READ-06 Rebuild the mobile chapter header so it does not wrap vertically at 375px.
- [x] READ-07 Make every verse keyboard-operable and expose selected/comment-panel state.
- [x] READ-08 Make the mobile comment sheet a real dialog; close locally rather than via browser history.
- [x] READ-09 Make the comment panel resizer keyboard-operable and prevent username/action overflow.
- [x] READ-10 Label comment inputs/search/report controls and announce failures.
- [x] READ-11 Confirm comment deletion and keep reply/expand/report/vote/bookmark states coherent.
- [x] READ-12 Clarify loaded-vs-total comment counts and loaded-only filtering.
- [x] SEARCH-01 Preserve results during search, expose failures/retry, and guide empty queries.
- [x] SEARCH-02 Make every result card/link valid and keyboard-accessible; remove nested interactive markup.
- [x] SEARCH-03 Increase filter/pagination targets and announce result counts.

## Phase 4 — Q&A and community/account surfaces

- [x] QA-01 URL-sync and debounce question search.
- [x] QA-02 Give genre/book filters distinct labels and correct heading hierarchy.
- [x] QA-03 Separate expand-replies and answer-form state; expose answer failures/retry.
- [x] QA-04 Label answer/question fields, preserve whitespace, and link authors to profiles.
- [x] QA-05 Make tags a named selection group with pressed states and 44px targets.
- [x] QA-06 Protect dirty question drafts and surface per-field errors.
- [x] NOTE-01 Make all notifications semantic links/buttons with busy/error states.
- [x] NOTE-02 Fix refresh invocation and add unread/date/type/filter semantics.
- [x] BOOKMARK-01 Make optimistic removal/undo transactional and preserve translation identity.
- [x] BOOKMARK-02 Update counts immediately; explain broken targets; add saved date/translation.
- [x] PROFILE-01 Separate loading/not-found/error states and avoid empty-state flashes.
- [x] PROFILE-02 Label privacy switches, add busy/error states, and split save statuses.
- [x] PROFILE-03 Link public activity to its source and paginate articles.
- [x] PROFILE-04 Add account settings for password, notifications, sessions, and deletion.
- [x] AUTH-01 Preserve `from` across login/register/OAuth/session-expired flows.
- [x] AUTH-02 Add field-specific validation, password confirmation/rules/strength, and focus the first error.
- [x] AUTH-03 Add password recovery and reliable OAuth/logout error states.
- [x] AUTH-04 Prevent authenticated-page flashes during auth resolution.

## Phase 5 — Articles and citations

- [x] ARTICLE-01 Make autosave durable, flush pending edits, warn on unsafe exit, and expose retry/live status.
- [x] ARTICLE-02 Associate every editor/new/comment/citation field with a visible label.
- [x] ARTICLE-03 Respect tag query filters and add full pagination/total/result states.
- [x] ARTICLE-04 Separate own/public article actions and remove duplicate listing.
- [x] ARTICLE-05 Prevent IME Enter from accidentally creating an article.
- [x] ARTICLE-06 Add title/summary/tag limits, dirty cancellation, and next-step guidance.
- [x] ARTICLE-07 Explain and confirm publication changes; enforce ownership during auth loading.
- [x] ARTICLE-08 Replace fixed double-scroll editing with a responsive layout and Markdown help.
- [x] ARTICLE-09 Distinguish not-found/private/error; expose related-article/comment failures.
- [x] ARTICLE-10 Make citations accessible, preserve translation identity, recover broken citations, and explain external links.
- [x] ARTICLE-11 Correct invalid error design tokens and provide login CTAs in comments.

## Phase 6 — Translation workflows and reading

- [x] TRANS-01 Debounce and URL-sync project search; group/label results and source books.
- [x] TRANS-02 Hide irrelevant guest draft UI and avoid fetching hidden mobile columns.
- [x] TRANS-03 Fix create-form labels, validation, mobile font size, auth flash, and dirty exit.
- [x] TRANS-04 Add project information/license editing.
- [x] TRANS-05 Simplify owner actions; separate destructive controls and remove duplicate read CTAs.
- [x] TRANS-06 Add semantic tabs, consistent status labels, interactive progress filters, and chapter progress.
- [x] TRANS-07 Add unit status/assignee/my-unit filters and explicit no-unit states.
- [x] TRANS-08 Add unit labels, autosave, shortcut consistency, keyboard mentions, single deletion, and batch result reporting.
- [x] TRANS-09 Add review loading/error, reliable unit navigation, revision requests, and refreshed counts.
- [x] TRANS-10 Add member loading/error/profile links/dates/workload and safe approve/reject/remove actions.
- [x] TRANS-11 Clarify project Q&A visibility and provide complete discussion states.
- [x] TRANS-12 Add source visibility/compare modes, semantic breadcrumbs, unobstructed chapter navigation, and mobile comment sheet behavior.
- [x] TRANS-13 Preserve project/translation identity in bookmarks and show real total comments.

## Phase 7 — Static, legal, demo, and design-system completion

- [x] STATIC-01 Localize and enrich not-found recovery routes.
- [x] STATIC-02 Add current-status/next-action hierarchy to About.
- [x] STATIC-03 Replace feedback-only mailto with an accessible fallback form/choice.
- [x] STATIC-04 Add TOCs, anchors, dates, related links, and operational paths to policies/guidelines/licenses.
- [x] STATIC-05 Align source/license promises with book and project UI.
- [x] STATIC-06 Update demos into a complete component-state catalog or remove them from production navigation.
- [x] STATIC-07 Add consistent semantic time, heading, line-height, truncation, and responsive rules.

## Verification gates

- [x] Focused backend permission/state tests pass.
- [x] Focused frontend component/page tests pass.
- [x] Full backend `pytest` passes.
- [x] Full frontend `npm test` passes.
- [x] Frontend lint passes with no new warnings.
- [x] Frontend production build passes.
- [x] Desktop and 375/390px visual smoke checks pass for public and authenticated states.
- [x] Keyboard-only smoke checks pass for navigation, dialogs, tabs, verses, comments, forms, and destructive confirmations.
- [x] No unrelated user changes are overwritten.
- [x] Final tracker accurately records completed and deferred work.
- [ ] Branch is committed and pushed.

## Progress log

- 2026-08-01: Completed exhaustive route/component audit and production visual review.
- 2026-08-01: Created dedicated worktree/branch and divided implementation into four non-overlapping workstreams.
- 2026-08-01: Started translations, public/common/reader, community/auth, and articles workstreams in parallel.
- 2026-08-01: Implemented the article safety and UX pass: durable autosave/flush/retry, guarded publishing and cancellation, semantic fields/tabs, responsive editing, URL-synced tag filtering, paginated feeds, non-duplicated own/public listings, recoverable detail/comment/citation states, and focused tests.
- 2026-08-01: Ran an integration TypeScript check while parallel work was active; routed all interim errors back to the owning workstreams.
- 2026-08-01: Article-focused verification passed: 29 frontend tests and 27 backend article tests.
- 2026-08-01: Completed the public/common/reader/search/static pass. Scoped lint and TypeScript passed; 36 focused tests passed, and the full run reached 300 passing tests with only three translation tab assertions awaiting update.
- 2026-08-01: Removed obsolete `/demo/home` and `/demo/ui` implementations by redirecting them into the maintained accessible `/demo` catalog.
- 2026-08-01: Completed the community/auth pass: URL-synced Q&A search and in-list answers, recoverable comment/notification/profile states, transactional bookmark undo, safe auth return paths, accessible dialogs, and 82 focused tests.
- 2026-08-01: Re-audited static-page claims, then added real policy TOCs/anchors/update dates/related links plus an anonymous first-party feedback form and rate-limited email endpoint (2 frontend and 3 backend tests passing).
- 2026-08-01: Completed the translation safety and workflow pass, including draft permissions, membership state, unsaved-change protection, settings/review/member actions, unit filters/progress, and source comparison. Verification: 81 backend tests, 16 focused frontend tests, and the 310-test frontend suite passed.
- 2026-08-01: Residual permission audit found draft metadata/comment leakage through generic comments and public bookmark serialization; SAFE-02 returned to in-progress pending dedicated regression coverage.
- 2026-08-01: Removed the final silent book-catalog failure path used by Q&A and new translation forms; both now distinguish loading/failure and expose retry (3 focused tests passing).
- 2026-08-01: Deeper unit-API audit found writable assignment/verse fields and a draft existence oracle; SAFE-07 returned to in-progress for serializer hardening and regression tests.
- 2026-08-02: Closed the residual draft-visibility and review-boundary findings. Hidden projects now return the same 404 shape across project, unit, summary, comment, bookmark, notification, and read paths; 44 new draft-security tests and 154 related backend tests passed.
- 2026-08-02: Completed account settings, notification preferences, password recovery, session/deletion controls, OAuth/logout error handling, authenticated-route loading guards, and route-specific metadata coverage.
- 2026-08-02: Removed obsolete standalone demo/default assets and added redirects to the maintained component catalog.
- 2026-08-02: Enabled an environment-scoped local-network dev origin so the in-app browser can inspect the local application even when direct `localhost` access is unavailable.
- 2026-08-02: Browser smoke-tested real seeded data for `/read`, Q&A search and in-list answering, translation search, public translation reading, mobile navigation/dialog behavior, profile/settings, and owner-only translation management. A guest-owner detection regression discovered during the pass was fixed and covered by tests.
- 2026-08-02: Integrated the latest `origin/main`, preserving its i18n, API aggregation, loading-state, and performance work alongside the full UX/security pass. Resolved and re-tested every conflict across four parallel workstreams.
- 2026-08-02: Final frontend verification passed: 63 Vitest files / 353 tests, TypeScript, zero-warning ESLint, production build, and 43/43 Playwright E2E scenarios with a single deterministic worker.
- 2026-08-02: Final backend verification passed: 601 tests passed and 13 platform-specific import tests were skipped (614 collected). Django system checks and migration-drift checks also passed.
- 2026-08-02: Committed the fully verified integration and pushed `codex/list-searches-qa-answer` for the production merge gate.
- 2026-08-02: Re-integrated `origin/main` after PR #57 added reading plans. Audited all four new plan routes and supporting panels, added complete loading/error/auth/i18n/A11y behavior, and closed three uncovered plan API boundary issues with regression tests.
- 2026-08-02: Final post-integration verification passed: backend 629 passed / 13 skipped (642 collected), frontend 68 files / 376 tests, TypeScript, zero-warning ESLint, 32-route production build, Django checks, and 48/48 deterministic Playwright E2E scenarios.
- 2026-08-02: E2E exposed a React Strict Mode autosave status regression; restored the mounted lifecycle correctly and added dedicated regression coverage.
- 2026-08-02: Committed the second latest-main integration as `1d406d9` and pushed the fully verified branch to PR #59.
- 2026-08-02: Integrated `origin/main` through `9c88f56` (PRs #58 and #60), reconciling the upstream reading-plan localization with the fuller error, retry, auth, keyboard, and accessibility treatment. Japanese and English now each expose 568 matching i18n keys with no duplicates.
- 2026-08-02: Post-`9c88f56` verification passed again: 68 frontend files / 376 tests, TypeScript, zero-warning ESLint, 32-route production build, and all 48 E2E scenarios (47 in the full run plus the corrected strict-locator case focused).
