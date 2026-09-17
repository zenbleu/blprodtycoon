---
name: GitHub Pages asset storage
description: Deployment depends on real media bytes being available for the repository's Git LFS pointers.
---

GitHub Pages must receive hydrated media files, not the small Git LFS pointer text files committed in the repository.

**Why:** The public repository currently returns 404 for the referenced LFS object IDs, so checkout cannot restore the JPG/PNG bytes even when the Pages workflow enables LFS.

**How to apply:** Restore or re-upload the media to the repository's LFS storage before expecting the Pages workflow to deploy the artwork. Keep the workflow's LFS checkout and pointer validation enabled.