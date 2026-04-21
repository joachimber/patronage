/**
 * One-shot: fetch real name/symbol/image/description for every BAGS mint
 * via Helius DAS getAssetBatch, and write to lib/bags-mint-metadata.json.
 *
 * Run with: `npx tsx scripts/fetch-bags-metadata.ts`
 * Re-run whenever the seed list in lib/bags-mints.ts changes.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { BAGS_MINTS } from "../lib/bags-mints";

const RPC = process.env.HELIUS_RPC_URL;
if (!RPC) {
  console.error("HELIUS_RPC_URL not set — populate .env.local then:\n" +
    "  export $(grep -v '^#' .env.local | xargs) && npx tsx scripts/fetch-bags-metadata.ts");
  process.exit(1);
}

type DasAsset = {
  id: string;
  content?: {
    metadata?: { name?: string; symbol?: string; description?: string };
    links?: { image?: string };
    files?: Array<{ uri?: string; cdn_uri?: string; mime?: string }>;
  };
  token_info?: { price_info?: { price_per_token?: number } };
};

type Meta = {
  mint: string;
  name: string | null;
  symbol: string | null;
  description: string | null;
  image: string | null;
};

async function batch(ids: string[]): Promise<DasAsset[]> {
  const res = await fetch(RPC!, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "bags-meta",
      method: "getAssetBatch",
      params: { ids },
    }),
  });
  if (!res.ok) throw new Error(`getAssetBatch failed: ${res.status}`);
  const j = await res.json();
  if (j.error) throw new Error(JSON.stringify(j.error));
  return (j.result ?? []).filter(Boolean) as DasAsset[];
}

function pickImage(a: DasAsset): string | null {
  const cdn = a.content?.files?.[0]?.cdn_uri;
  if (cdn) return cdn;
  return a.content?.links?.image ?? null;
}

async function main() {
  const chunks: string[][] = [];
  const size = 50;
  for (let i = 0; i < BAGS_MINTS.length; i += size) {
    chunks.push([...BAGS_MINTS.slice(i, i + size)]);
  }

  const results: Meta[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const ids = chunks[i];
    process.stdout.write(`  batch ${i + 1}/${chunks.length} (${ids.length} ids)… `);
    const assets = await batch(ids);
    const byId = new Map(assets.map((a) => [a.id, a] as const));
    for (const id of ids) {
      const a = byId.get(id);
      if (!a) {
        results.push({ mint: id, name: null, symbol: null, description: null, image: null });
        continue;
      }
      results.push({
        mint: id,
        name: a.content?.metadata?.name ?? null,
        symbol: a.content?.metadata?.symbol ?? null,
        description: a.content?.metadata?.description ?? null,
        image: pickImage(a),
      });
    }
    console.log("ok");
  }

  const hit = results.filter((r) => r.name || r.symbol).length;
  console.log(`\nresolved ${hit}/${results.length} mints`);

  const out = join(process.cwd(), "lib/bags-mint-metadata.json");
  writeFileSync(out, JSON.stringify(results, null, 2));
  console.log(`wrote ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
