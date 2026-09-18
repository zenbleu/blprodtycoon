---
name: Desktop packaging
description: Constraints for the Windows portable Electron build and release metadata.
---

Electron Builder validates the `build` object strictly, so repository/update metadata must stay outside that object or be supplied through workflow environment values. The packaged app must also declare its CommonJS desktop entry explicitly because the Vite entry is only the renderer.

**Why:** A portable Windows build otherwise fails before producing an executable, even when the renderer build is healthy.

**How to apply:** Keep the desktop shell entry in the package manifest and pass repository-specific release context to the release metadata script through the GitHub Actions environment.