# Core UI Package

This package will encapsulate the shared design system for v2.

## Responsibilities
- Theme tokens (colors, typography, spacing, shadows)
- Shared widgets (buttons, cards, loaders, modal sheets)
- Animation primitives and parallax effects
- Responsive layout utilities (breakpoints for mobile/tablet/web)
- Accessibility helpers (contrast enforcement, semantics wrappers)

## Planned Tech
- `flutter` with `material 3` baseline
- `rive` / `lottie` integration helpers
- `google_fonts` for typographic pairs
- `motion` package for declarative animations

## Deliverables
1. Exported `ThemeData` for light/dark themes.
2. Component catalog documented via `storybook_flutter`.
3. Snapshot tests ensuring visual regressions are caught in CI.
