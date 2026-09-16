# Contributing

Thanks for your interest in Khaen Logic. The project is centered on one physical instrument model: the 16-pipe Khaen layout verified by its owner. Protecting the accuracy of that layout and its note relationships is the most important contribution constraint.

## Before changing instrument or theory behavior

- Keep the verified pipe order, positions, and high/low relationships unchanged unless the owner supplies new physical verification.
- Keep instrument data in `src/domain/instruments/` and music-theory behavior in `src/domain/theory/`; avoid duplicating those rules in React components.
- Add or update focused tests for mapping and music-theory changes.
- Do not describe pitch-class chord analysis as inversion- or voicing-aware; the current data does not encode bass order or register-specific voicings.
- Keep MIDI optional. The app must remain usable with mouse/touch input when Web MIDI is missing or permission is unavailable.
- Keep the app client-only unless a separately agreed product requirement introduces a backend.

## Local checks

Use Node.js 22.12 or later and install the exact dependency graph from the lockfile:

```sh
npm ci
npm test
npm run build
git diff --check
```

For UI changes, also run the app with `npm run dev` and check the affected portrait and landscape sizes. Confirm that the pipe diagram, settings, chord card, and controls remain reachable.

## Pull requests

Please describe the user-visible change, the reason for any musical mapping change, and the checks you ran. Include screenshots for visual changes when practical. Keep changes focused and avoid adding dependencies unless they are needed for the stated behavior.

## Licensing

The repository currently has no license file. Please do not assume that contribution or reuse rights have been granted; a project owner must choose and add a license before that can be stated.
