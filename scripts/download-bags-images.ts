/**
 * Download every Bags token image locally so we don't depend on IPFS or Helius
 * CDN at runtime. Writes to public/bags/{mint}.{ext} and updates the metadata
 * JSON with a `localImage` path.
 *
 * Run with: `npx tsx scripts/download-bags-images.ts`
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";

type Meta = {
  mint: string;
  name: string | null;
  symbol: string | null;
  description: string | null;
  image: string | null;
  localImage?: string | null;
};

const OUT_DIR = join(process.cwd(), "public/bags");
const METADATA_PATH = join(process.cwd(), "lib/bags-mint-metadata.json");

const MIME_TO_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

// Alternate IPFS gateways to try if the primary (ipfs.io) fails. Cloudflare
// and Pinata are much faster in practice.
const GATEWAYS = [
  "https://cloudflare-ipfs.com/ipfs/",
  "https://gateway.pinata.cloud/ipfs/",
  "https://ipfs.io/ipfs/",
];

function ipfsVariants(url: string): string[] {
  const match = url.match(/\/ipfs\/([^/?#]+.*)$/);
  if (!match) return [url];
  const cidPath = match[1];
  return GATEWAYS.map((g) => g + cidPath);
}

async function tryFetch(url: string, timeoutMs = 15000): Promise<{ buf: Buffer; contentType: string } | null> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ac.signal });
    if (!res.ok) return null;
    const contentType = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 50) return null; // empty/placeholder
    return { buf, contentType };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function download(url: string): Promise<{ buf: Buffer; contentType: string } | null> {
  const urls = ipfsVariants(url);
  for (const u of urls) {
    const r = await tryFetch(u);
    if (r) return r;
  }
  return null;
}

function extFromBuf(buf: Buffer, fallbackCT: string): string {
  // Magic bytes
  if (buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png";
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.length > 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "webp";
  if (buf.length > 6 && (buf.toString("ascii", 0, 6) === "GIF87a" || buf.toString("ascii", 0, 6) === "GIF89a")) return "gif";
  if (buf.length > 5 && buf.toString("utf8", 0, 5).toLowerCase().includes("<svg")) return "svg";
  return MIME_TO_EXT[fallbackCT] ?? "png";
}

async function main() {
  if (!existsSync(METADATA_PATH)) {
    console.error(`missing ${METADATA_PATH} — run fetch-bags-metadata.ts first`);
    process.exit(1);
  }
  const metadata: Meta[] = JSON.parse(readFileSync(METADATA_PATH, "utf8"));
  mkdirSync(OUT_DIR, { recursive: true });

  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < metadata.length; i++) {
    const m = metadata[i];
    if (!m.image) {
      failed++;
      continue;
    }
    process.stdout.write(`[${i + 1}/${metadata.length}] ${m.symbol ?? m.mint.slice(0, 6)}… `);
    const result = await download(m.image);
    if (!result) {
      console.log("FAIL");
      failed++;
      continue;
    }
    const ext = extFromBuf(result.buf, result.contentType);
    const rel = `/bags/${m.mint}.${ext}`;
    const abs = join(process.cwd(), "public", rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, result.buf);
    m.localImage = rel;
    console.log(`${ext} · ${Math.round(result.buf.length / 1024)}kb`);
    ok++;
  }

  writeFileSync(METADATA_PATH, JSON.stringify(metadata, null, 2));
  console.log(`\ndone: ${ok} saved, ${skipped} skipped, ${failed} failed`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
