# talk2graph Product Implementation Design

## Goal

Implement `docs/产品需求.md` as a usable web product for K12 math teachers: natural-language graph creation, precise math output, continuous modification, and SVG/TikZ export with a first-use path that does not require teachers to configure model credentials in the browser.

## Requirements Mapping

- Natural-language input: the UI accepts Chinese prompts and sends them to a graph generation layer.
- Precise math graphics: high-frequency classroom examples use deterministic TikZ templates with numeric coordinates and labels.
- Continuous modification: each graph version is kept as code state; modifications operate on the current source and keep unrelated drawing commands unchanged where possible.
- Export: the browser exports the rendered SVG and the current TikZ source.
- Non-functional needs: the app is served as a normal HTTPS web page, avoids browser-exposed API keys, self-hosts local project assets, and gives Chinese error feedback.

## Architecture

The product uses a small Node.js server plus static frontend files.

- `server.js` serves `index.html`, static assets, and `/api/generate`.
- `src/graph-engine.js` provides deterministic TikZ generation for common K12 examples and modification requests. It is CommonJS-compatible for tests and also exposes `window.Talk2GraphEngine` in the browser.
- `src/llm-client.js` calls an OpenAI-compatible Chat Completions API from the server when no deterministic template matches.
- `index.html` uses `/api/generate` by default. It keeps the current TikZ source, version history, and rendered SVG in browser state.

The deterministic layer handles the product examples first:

- right triangle with legs 3 and 4 and side labels;
- `sin(x)` and `cos(x)` over `-2π` to `2π`;
- circle with an inscribed regular hexagon and center label;
- coordinate range changes such as `-5 到 5`;
- removing side labels and adding the altitude to the hypotenuse;
- moving the right-angle marker while preserving unrelated geometry.

Unknown prompts fall back to the server-side LLM. If the LLM is not configured, the API returns a Chinese error explaining that this drawing is outside the built-in templates.

## Data Flow

1. The user submits Chinese text.
2. The frontend calls `POST /api/generate` with `{ prompt, currentTikzSource }`.
3. The server calls `generateGraph`.
4. If a deterministic template or modifier matches, the server returns TikZ directly.
5. Otherwise the server calls the configured OpenAI-compatible API.
6. The frontend renders the returned TikZ and updates the history stack.

## Error Handling

- Missing prompt returns HTTP 400 with a Chinese message.
- Unmatched prompt without model configuration returns HTTP 422 with a Chinese message and no state mutation.
- LLM errors return HTTP 502 with a Chinese message.
- Render errors keep the previous successful source available for download and show a Chinese user-facing error.

## Testing

Use Node's built-in `node:test` runner.

- Core tests prove deterministic examples produce complete TikZ documents with exact coordinates, labels, and PGFPlots ranges.
- Modification tests prove unrelated source sections are preserved by checking stable drawing commands remain in the modified source.
- Server tests prove `/api/generate` returns built-in templates without external credentials and returns controlled errors for unknown prompts.

## Deployment

`deploy_cos.py` should upload all static assets used by `index.html`, not only `index.html`. The recommended production runtime is the Node server behind HTTPS because it protects model credentials. COS static hosting remains useful for frontend-only demos, but it cannot satisfy the no-browser-key product requirement by itself.
