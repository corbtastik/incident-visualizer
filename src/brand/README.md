# MongoDB brand tokens (vendored)

`brand.css` and everything under `tokens/` are copied verbatim from the MongoDB
LeafyGreen design-system pack. **Do not edit them.** Refreshing the pack should
be a straight overwrite of this directory.

Anything this app needs on top of the pack -- the dark-mode semantic layer, the
mapping from these tokens onto the app's own variables -- lives in
`src/styles.css`, not here.

Logos and the favicon are in `public/brand/`, copied from the same pack.

## Fonts

The brand faces (Euclid Circular A, MongoDB Value Serif) are proprietary and are
not in the pack. `tokens/fonts.css` names them first and resolves them through
Google Fonts substitutes (Hanken Grotesk, Source Serif 4); Source Code Pro is an
exact match. To go pixel-perfect, drop the licensed `woff2` files into
`src/brand/fonts/` and point the `@font-face` `src` at them -- nothing else
changes, because the app only ever references `--font-sans` / `--font-mono`.
