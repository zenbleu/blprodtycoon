---
name: GitHub Pages asset storage
description: GitHub Pages requires the repository to contain hydrated media bytes because the original LFS objects are unavailable.
---

The repository now stores the supplied actor portraits and loading backgrounds as
real image bytes. Their SHA-256 hashes match the object IDs recorded by the
original LFS pointers, so the app keeps its existing asset paths without relying
on LFS checkout.

**Why:** The public repository returns 404 for the referenced LFS object IDs, so
the bytes must be committed directly for GitHub Pages to publish the media.

**How to apply:** The Pages workflow checks out without LFS, removes only the
unusable pointer files before Vite copies static assets. With the restored media
the cleanup is a no-op, while the existing initials/color portrait fallback
remains available for any future missing image.