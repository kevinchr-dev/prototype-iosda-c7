# Photo Triage Prototype

A multi-page mobile-first prototype that simulates a photo curation flow inspired by the provided wireframes. The experience guides a user from inserting a Google Drive link, through authentication, preparation, Tinder-style swiping, duplicate resolution via pairwise comparison, and finally to a summary modal.

## Highlights

- **Mobile viewport**: All pages are framed inside a mobile shell. On large screens the layout scales down to keep the mobile look.
- **Persistent flow**: Lightweight state is stored in `localStorage` to remember whether the user has already visited, the selected target count, swipe decisions, duplicate groups, and refined selections.
- **Multi-page navigation**: Every stage lives in its own HTML file as requested (`index.html`, `login.html`, `login-google.html`, `prepare.html`, `swipe.html`, `pairwise.html`, `summary.html`). Transitions are scripted redirects.
- **Swipe interactions**: The swipe screen supports pointer/touch gestures that mimic Tinder. Users can drag cards or tap check/cross buttons.
- **Duplicate handling**: A manifest-driven loader scans `photos/manifest.json`, detects simple filename-based duplicates, and branches into the pairwise comparison screen.
- **Modal choreography**: Timed modals appear according to specification (target input, swipe results, method selection) with soft animations.

## Getting Started

1. Serve the folder with any static HTTP server (Live Server, `python -m http.server`, etc.) to avoid CORS restrictions when fetching `manifest.json`.
2. Open `index.html` from the server in a browser. You will be forced into the mobile preview frame automatically.
3. Paste any dummy Google Drive link and start the flow. The first visit routes through the mocked Google login before continuing.

## Customizing Photos

- Drop your images (JPEG/PNG/SVG) inside `photos/`.
- Regenerate the manifest automatically:
  ```bash
  python3 scripts/generate_manifest.py
  ```
  The script scans the folder, filters supported extensions, and rewrites `photos/manifest.json` with the correct relative paths.
- The manifest is fetched at runtime. Duplicate detection currently relies on filename similarity, so similar names (e.g. `IMG_1234` and `IMG_1234 (1)`) will be grouped.

## Flow Summary

1. **Home (`index.html`)** – Paste a Drive link and start.
2. **Login (`login.html`)** – Only shown on the first visit. Tapping the Google button opens a mocked login page.
3. **Google Mock (`login-google.html`)** – Displays faux OAuth form and auto-redirects after 3 seconds.
4. **Prepare (`prepare.html`)** – Shows a loading spinner, prompts for target count after 0.5s, then auto-redirects to swipe 5s after confirmation.
5. **Swipe (`swipe.html`)** – Gestural yes/no triage. After all photos, a modal summaries approvals and duplicates.
6. **Pairwise (`pairwise.html`)** – Only if duplicates exist. Compare portrait/landscape pairs or keep all.
7. **Summary (`summary.html`)** – Displays the curated grid and a 0.5s delayed method-selection modal. Restart button resets everything except the "already visited" flag.

## Notes

- The login sequence is purely illustrative; no real Google OAuth calls are made.
- Swipe physics use pointer events; test on touch-capable devices for the best feel.
- State reset (`Restart`) preserves `hasVisited` to skip the login the next time, matching the requirement.
- Animations and UI styling live in `assets/css/base.css`; adjust tokens there to reskin the prototype.

Enjoy iterating on the prototype! Contributions and tweaks are welcome.
