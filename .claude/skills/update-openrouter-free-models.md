# Update OpenRouter Free Models

Update the OpenRouter free models list in the codebase by fetching the latest top 5 free models from OpenRouter.

## Steps

1. Fetch the free models from the OpenRouter API to get exact model slugs:
   ```bash
   curl -s "https://openrouter.ai/api/v1/models" | python3 -c "
   import json, sys
   data = json.load(sys.stdin)
   free = [m for m in data.get('data', []) if m.get('pricing', {}).get('prompt') == '0' and m.get('pricing', {}).get('completion') == '0']
   for m in free[:20]:
       print(f\"{m['id']} - {m.get('name', 'N/A')}\")
   "
   ```
2. Visit https://openrouter.ai/collections/free-models to identify the top 5 ranked free models by usage/popularity.
3. Cross-reference the page rankings with the API slugs to get exact model IDs.
4. Update the `openrouter` entry in `TEXT_MODEL_CONFIGS` in `src/lib/ai/providers.ts`:
   - Replace the `models` array with the new top 5 free models.
   - Set `defaultModel` to the first model in the list.
   - Use the format: `{ id: "provider/model-name:free", name: "Display Name (Free)" }`.
   - Append `(Free)` to display names if not already present.
5. Run `pnpm typecheck` to verify no type errors were introduced.
