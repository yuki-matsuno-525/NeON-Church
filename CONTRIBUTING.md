# Contributing to NeON Church

Thank you for helping build NeON Church. Contributions of any size are welcome.

## Ways to contribute

We especially welcome help with:

- frontend and backend development;
- UI, accessibility, and Japanese/English localization;
- documentation and contributor onboarding;
- collaborative-translation and community features;
- corrections to text metadata, sources, and edition information; and
- moderation and community-safety tooling.

## Local setup

You need Git, Docker, and Docker Compose.

```bash
git clone https://github.com/yuki-matsuno-525/NeON-Church.git
cd NeON-Church
cp .env.example .env
docker-compose up --build
```

The frontend is available at <http://localhost:3000> and the backend API at
<http://localhost:8000>. See the [README](README.md) for data-import commands
and a fuller description of the project.

## Tests

Run the relevant checks before opening a pull request:

```bash
# Backend
docker-compose exec backend pytest

# Frontend unit tests
docker-compose exec frontend npm test

# Frontend lint
docker-compose exec frontend npm run lint

# End-to-end tests, when the change affects a user flow
docker-compose exec frontend npx playwright test
```

Keep the existing containers running when executing frontend commands. Running
a second frontend process on the host can conflict with the `.next` directory
mounted into the container.

## Contribution workflow

1. Search the existing issues before starting.
2. For non-trivial changes, open an issue describing the problem and proposed
   approach. This helps avoid duplicated or conflicting work.
3. Create a focused branch from `main`.
4. Make the smallest coherent change and add or update tests where appropriate.
5. Run the relevant checks above.
6. Open a pull request, link the issue, explain the change, and note any known
   limitations or follow-up work.

Small typo and documentation fixes may be submitted directly as pull requests.
Please do not include unrelated formatting or refactoring in the same change.

## Use of AI tools

AI-assisted contributions are allowed. The contributor remains responsible for
the accuracy, security, licensing, and maintainability of everything submitted.

- Review and understand generated code or text before submitting it.
- Run the relevant tests; generated output is not accepted as verification by
  itself.
- Disclose substantial AI assistance in the pull-request description.
- Do not send secrets, personal data, or unpublished project information to an
  AI service.
- Do not use AI output to fabricate users, sources, test results, or scholarly
  authority.

## Scripture and translation data

The source code is licensed under the [MIT License](LICENSE), but the scripture,
translation, commentary, and other text data may have different licenses. The
current source and license notices are listed on the
[Licenses page](https://neon-church.com/licenses).

Before adding or changing text data:

- identify the work, edition, source, and applicable license;
- confirm that redistribution and modification are permitted;
- preserve required attribution and source metadata;
- distinguish source-text corrections from editorial interpretation; and
- open an issue before importing a new work or edition.

Do not submit text merely because it is available on another website. Copyright
status varies by work, edition, translation, and jurisdiction. If the license or
provenance is unclear, open an issue and discuss it before preparing a pull
request.
