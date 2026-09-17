---
name: GitHub Pages asset storage
description: The imported repository has unavailable Git LFS media; Pages builds without those files and uses UI fallbacks.
---

The imported repository's original media is represented by Git LFS pointer files,
but the corresponding objects are unavailable. GitHub Pages cannot hydrate those
objects during checkout.

**Why:** The public repository returns 404 for the referenced LFS object IDs, so
enabling LFS makes the Pages checkout fail before the build starts.

**How to apply:** The Pages workflow checks out without LFS, removes only the
unusable pointer files before Vite copies static assets, and relies on the
existing initials/color portrait fallback plus the loading screen's CSS
background. If original artwork is restored later, remove the cleanup step and
re-enable LFS hydration.