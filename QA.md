# Interaction validation

Validated with the browser preview on 2026-10-22.

- Desktop viewport fixtures: 1280×720, 1366×768, 1440×900, 1920×1080.
- All four steps at each size: card and spotlight remain within the viewport, no overlap between explanation and spotlight, no horizontal page overflow (16/16).
- Previous, next, direct step navigation, restart, skip, close, completion, repeat after completion, and re-entry all exercised.
- Keyboard: left/right arrows, Escape, focus containment with Shift+Tab, and focus restoration on exit exercised.
- Building selection filters the sample tickets; details open and close.
- Creating a temporary ticket updates the list and makes the ticket searchable.
- Browser-local mutations only. Reload restores sample data.
- The viewport fixture is internal QA only and is excluded from the deployment.

## Soft-focus revision

- All 16 step/viewport cases pass again with the soft-focus overlay.
- Background: 80% dark navy, 5px backdrop blur, reduced saturation.
- Aperture: Gaussian feather, 13px standard deviation, no visible outline.
- Spotlight motion: 620ms eased interpolation; smooth scrolling; card and exit fades.
- Completion, restart, skip, Escape, restored focus, and host interactivity exercised after the motion changes.
- Operating-system reduced motion disables interpolation, smooth scrolling, and CSS transitions.
