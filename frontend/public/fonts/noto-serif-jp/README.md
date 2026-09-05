# Noto Serif JP web font

This directory contains the exact WOFF2 subsets previously emitted by
Next.js 16.2.4 for `Noto_Serif_JP` at weights 400 and 700. They are committed
so production builds do not depend on Google Fonts availability while the
existing typography remains pixel-compatible with the reviewed visual
baselines.

- License: SIL Open Font License 1.1 (`LICENSE.txt`)
- CSS declarations: `frontend/src/styles/noto-serif-jp.css`
- Integrity manifest: `SHA256SUMS`
- Source configuration: commit `a7ad487`, `frontend/src/app/layout.tsx`

Do not regenerate or replace these files without running and reviewing the
full Linux visual-regression suite.
