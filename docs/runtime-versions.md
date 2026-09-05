# Runtime versions

NeON Church uses one reviewed runtime set for local development, CI, and containers. Runtime drift is treated as a test-environment defect because it can hide compatibility and database-specific failures.

| Runtime | Standard version | Declaration |
| --- | ---: | --- |
| Node.js | 22.23.1 (LTS) | `.tool-versions`, `.nvmrc`, `.node-version`, `frontend/package.json`, CI, Docker |
| npm | 10.9.8 | `frontend/package.json` (`packageManager`, `engines`, and `devEngines`); bundled with the selected Node.js release |
| Python | 3.13.15 | `.tool-versions`, `.python-version`, CI, Docker |
| PostgreSQL | 16.15 | `.tool-versions`, CI, Docker Compose |
| Chromium | 147.0.7727.15 (Playwright revision 1217) | `frontend/Dockerfile.visual`, visual CI runtime assertion |

`.tool-versions` is the cross-runtime source of truth. The single-runtime files are compatibility declarations for common Node.js and Python version managers. The duplicate declarations must be updated in the same change.

The frontend deliberately uses exact `devEngines` versions. npm checks these before `install`, `ci`, and `run`, so a developer does not accidentally produce evidence with a different Node.js or npm runtime. The regular `engines` field also describes the supported deployment runtime. Do not bypass a runtime error with `--force`; switch to the declared versions.

Patch upgrades are maintenance work, not unreviewed floating updates. When upgrading a runtime:

1. select a supported security-patched release;
2. update every declaration, CI setup action, and container image together;
3. recreate dependencies from the committed lockfiles;
4. run the backend, frontend, PostgreSQL integration, and E2E quality gates;
5. record any migration or compatibility impact in the change.

Docker image digests may be refreshed for a rebuild of the same reviewed version, but a tag or digest that resolves to another runtime version requires the full upgrade procedure above.

Visual regression evidence has stricter rendering requirements. `frontend/Dockerfile.visual` composes the exact Python and Node.js installations above with the architecture-specific digest of the Playwright browser image. The visual workflow builds that image, then verifies Python, Node.js, npm, and Playwright versions inside the running container before it creates evidence. Host-runner tool caches are not part of the visual baseline environment.
