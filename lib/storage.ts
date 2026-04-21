import { promises as fs, createReadStream } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { Readable } from "node:stream";
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { env } from "@/lib/env";

/**
 * Pluggable file storage. Selects R2 when the R2_* env vars are present;
 * otherwise falls back to local disk under `.data/files/` (gitignored). The
 * route code never sees the backing store — both adapters implement the same
 * interface and return the same `storageKey` shape (`<yyyymmdd>/<uuid>.<ext>`).
 */
export interface StorageAdapter {
  put(args: {
    bytes: Buffer;
    filename: string;
    contentType?: string;
  }): Promise<{ storageKey: string; sizeBytes: number }>;
  get(storageKey: string): Promise<Readable>;
  delete(storageKey: string): Promise<void>;
}

function sanitizeExt(name: string): string {
  const ext = path.extname(name).slice(0, 16).replace(/[^a-zA-Z0-9.]/g, "");
  return ext || ".bin";
}

function makeStorageKey(filename: string): string {
  const now = new Date();
  const day = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}`;
  const id = crypto.randomUUID();
  const ext = sanitizeExt(filename);
  return path.posix.join(day, `${id}${ext}`);
}

class LocalDiskStorage implements StorageAdapter {
  constructor(private readonly root: string) {}

  private absolute(storageKey: string): string {
    const resolved = path.resolve(this.root, storageKey);
    if (!resolved.startsWith(path.resolve(this.root))) {
      throw new Error("storage key escapes root");
    }
    return resolved;
  }

  async put({ bytes, filename }: { bytes: Buffer; filename: string; contentType?: string }) {
    const storageKey = makeStorageKey(filename);
    const abs = this.absolute(storageKey);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, bytes);
    return { storageKey, sizeBytes: bytes.byteLength };
  }

  async get(storageKey: string): Promise<Readable> {
    const abs = this.absolute(storageKey);
    await fs.access(abs);
    return createReadStream(abs);
  }

  async delete(storageKey: string) {
    const abs = this.absolute(storageKey);
    await fs.rm(abs, { force: true });
  }
}

class R2Storage implements StorageAdapter {
  private bucketReady: Promise<void> | null = null;

  constructor(
    private readonly client: S3Client,
    private readonly bucket: string,
  ) {}

  private async ensureBucket(): Promise<void> {
    if (this.bucketReady) return this.bucketReady;
    this.bucketReady = (async () => {
      try {
        await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
        return;
      } catch (err) {
        const status =
          (err as { $metadata?: { httpStatusCode?: number } })?.$metadata
            ?.httpStatusCode ?? 0;
        if (status !== 404 && status !== 301 && status !== 400) {
          throw err;
        }
      }
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
    })();
    try {
      await this.bucketReady;
    } catch (err) {
      this.bucketReady = null;
      throw err;
    }
  }

  async put({
    bytes,
    filename,
    contentType,
  }: {
    bytes: Buffer;
    filename: string;
    contentType?: string;
  }) {
    await this.ensureBucket();
    const storageKey = makeStorageKey(filename);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
        Body: bytes,
        ContentType: contentType ?? "application/octet-stream",
      }),
    );
    return { storageKey, sizeBytes: bytes.byteLength };
  }

  async get(storageKey: string): Promise<Readable> {
    const res = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: storageKey }),
    );
    const body = res.Body;
    if (!body) throw new Error(`empty R2 body for ${storageKey}`);
    return body as Readable;
  }

  async delete(storageKey: string) {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: storageKey }),
    );
  }
}

let _storage: StorageAdapter | null = null;

export function storage(): StorageAdapter {
  if (_storage) return _storage;
  const endpoint = env.R2_ENDPOINT;
  const accessKeyId = env.R2_ACCESS_KEY_ID;
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY;
  if (endpoint && accessKeyId && secretAccessKey) {
    const client = new S3Client({
      region: "auto",
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    });
    _storage = new R2Storage(client, env.R2_BUCKET);
    return _storage;
  }
  const root =
    process.env.PATRONAGE_STORAGE_DIR ?? path.resolve(process.cwd(), ".data/files");
  _storage = new LocalDiskStorage(root);
  return _storage;
}
