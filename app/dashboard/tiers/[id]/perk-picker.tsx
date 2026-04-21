"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/button";

interface PerkRow {
  id: string;
  pluginId: string;
  config: Record<string, unknown>;
}

interface PluginMeta {
  id: "web" | "files" | "telegram" | "email";
  label: string;
  tagline: string;
  description: string;
  comingSoon: boolean;
}

export function PerkPicker({
  tierId,
  initialPerks,
  plugins,
}: {
  tierId: string;
  initialPerks: PerkRow[];
  plugins: PluginMeta[];
}) {
  const router = useRouter();
  const [perks, setPerks] = useState<PerkRow[]>(initialPerks);
  const [activePlugin, setActivePlugin] = useState<PluginMeta | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function addPerk(config: Record<string, unknown>) {
    if (!activePlugin) return;
    setErr(null);
    const res = await fetch("/api/perks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tierId, pluginId: activePlugin.id, config }),
    });
    const j = await res.json();
    if (!res.ok) {
      setErr(j.error ?? "Could not add perk");
      return;
    }
    setPerks((prev) => [...prev, j.perk]);
    setActivePlugin(null);
    router.refresh();
  }

  async function uploadFile(f: File): Promise<{
    id: string;
    filename: string;
    sizeBytes: number;
  }> {
    const fd = new FormData();
    fd.append("tierId", tierId);
    fd.append("file", f);
    const res = await fetch("/api/files", { method: "POST", body: fd });
    const j = await res.json();
    if (!res.ok) throw new Error(j.error ?? "Upload failed");
    return j.file;
  }

  async function removePerk(id: string) {
    if (!confirm("Remove this perk?")) return;
    const res = await fetch(`/api/perks/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setErr("Could not remove");
      return;
    }
    setPerks((prev) => prev.filter((p) => p.id !== id));
    router.refresh();
  }

  return (
    <div className="grid grid-cols-12 gap-10">
      <section className="col-span-12 md:col-span-7">
        <div className="f-label mb-4" style={{ color: "var(--ink-faint)" }}>
          Attached perks
        </div>
        {err && (
          <div
            className="mb-4 p-3 border f-mono text-[12px]"
            style={{
              borderColor: "var(--vermillion)",
              color: "var(--vermillion)",
            }}
          >
            {err}
          </div>
        )}
        {perks.length === 0 ? (
          <div className="py-14 border border-dashed border-rule text-center">
            <p
              className="f-body text-[15px]"
              style={{ color: "var(--ink-soft)" }}
            >
              No perks attached yet. Pick a plugin on the right to add one.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-rule-soft border-y border-rule-soft">
            {perks.map((p) => {
              const meta = plugins.find((pl) => pl.id === p.pluginId);
              return (
                <li
                  key={p.id}
                  className="py-5 flex items-start justify-between gap-6"
                >
                  <div className="flex-1">
                    <div className="f-label" style={{ color: "var(--vermillion)" }}>
                      {meta?.label ?? p.pluginId}
                    </div>
                    <div className="f-body text-[15px] mt-1">
                      {summarize(p.pluginId, p.config)}
                    </div>
                  </div>
                  <button
                    onClick={() => removePerk(p.id)}
                    className="f-label hover:text-vermillion"
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <aside className="col-span-12 md:col-span-5">
        <div className="f-label mb-4" style={{ color: "var(--ink-faint)" }}>
          {activePlugin ? `Configure ${activePlugin.label}` : "Plugin picker"}
        </div>
        {activePlugin ? (
          <ConfigForm
            plugin={activePlugin}
            onCancel={() => setActivePlugin(null)}
            onSubmit={addPerk}
            upload={uploadFile}
          />
        ) : (
          <ul className="space-y-[1px]">
            {plugins.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => !p.comingSoon && setActivePlugin(p)}
                  disabled={p.comingSoon}
                  className={`w-full text-left p-5 border border-rule flex items-start justify-between gap-4 transition-colors ${p.comingSoon ? "opacity-60 cursor-not-allowed" : "hover:border-ink"}`}
                >
                  <div>
                    <div className="f-headline text-[18px]">{p.label}</div>
                    <div
                      className="f-body text-[13px] mt-1"
                      style={{ color: "var(--ink-soft)" }}
                    >
                      {p.tagline}
                    </div>
                  </div>
                  <div className="f-mono text-[11px] mt-1">
                    {p.comingSoon ? (
                      <span style={{ color: "var(--ink-faint)" }}>
                        Soon
                      </span>
                    ) : (
                      <span style={{ color: "var(--vermillion)" }}>Add →</span>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}

function summarize(pluginId: string, config: Record<string, unknown>): string {
  if (pluginId === "web") {
    return `${config.kind ?? "link"}: ${config.url ?? "—"}`;
  }
  if (pluginId === "files") {
    const name = (config.label as string) || (config.filename as string) || "File";
    const size =
      typeof config.sizeBytes === "number"
        ? ` · ${(config.sizeBytes / 1024).toFixed(1)} KB`
        : "";
    return `${name}${size}`;
  }
  return JSON.stringify(config);
}

type UploadFn = (f: File) => Promise<{
  id: string;
  filename: string;
  sizeBytes: number;
}>;

function ConfigForm({
  plugin,
  onCancel,
  onSubmit,
  upload,
}: {
  plugin: PluginMeta;
  onCancel: () => void;
  onSubmit: (cfg: Record<string, unknown>) => void;
  upload: UploadFn;
}) {
  if (plugin.id === "web") {
    return <WebForm onCancel={onCancel} onSubmit={onSubmit} />;
  }
  if (plugin.id === "files") {
    return <FilesForm onCancel={onCancel} onSubmit={onSubmit} upload={upload} />;
  }
  return (
    <div>
      <p className="f-body text-[14px]">Not configurable yet.</p>
      <button onClick={onCancel} className="f-label mt-4">
        Back
      </button>
    </div>
  );
}

function WebForm({
  onCancel,
  onSubmit,
}: {
  onCancel: () => void;
  onSubmit: (cfg: Record<string, unknown>) => void;
}) {
  const [kind, setKind] = useState<"youtube" | "notion" | "video" | "iframe">(
    "youtube",
  );
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ kind, url, title: title || undefined });
      }}
      className="space-y-5 border border-rule p-5"
    >
      <div>
        <label className="f-label" style={{ color: "var(--ink-faint)" }}>
          Kind
        </label>
        <div className="mt-2 flex gap-2">
          {(["youtube", "notion", "video", "iframe"] as const).map((k) => (
            <button
              type="button"
              key={k}
              onClick={() => setKind(k)}
              className={`f-label px-3 h-8 border ${kind === k ? "bg-ink text-bone border-ink" : "border-rule"}`}
            >
              {k}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="f-label" style={{ color: "var(--ink-faint)" }}>
          URL
        </label>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          placeholder="https://youtu.be/..."
          className="mt-2 w-full bg-transparent border-b border-ink outline-none py-2 f-mono text-[14px] focus:border-vermillion"
        />
      </div>
      <div>
        <label className="f-label" style={{ color: "var(--ink-faint)" }}>
          Title (optional)
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-2 w-full bg-transparent border-b border-rule outline-none py-2 f-body text-[15px] focus:border-vermillion"
        />
      </div>
      <div className="flex gap-3">
        <Button type="submit" variant="ink" size="sm">
          Attach
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function FilesForm({
  onCancel,
  onSubmit,
  upload,
}: {
  onCancel: () => void;
  onSubmit: (cfg: Record<string, unknown>) => void;
  upload: UploadFn;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState("");
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setErr(null);
    setUploading(true);
    try {
      const uploaded = await upload(file);
      onSubmit({
        fileId: uploaded.id,
        filename: uploaded.filename,
        sizeBytes: uploaded.sizeBytes,
        label: label || undefined,
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 border border-rule p-5">
      <p className="f-body text-[13px]" style={{ color: "var(--ink-soft)" }}>
        Upload a file for this tier. Each download click re-reads the holder&apos;s
        balance from Solana before streaming — stale links don&apos;t exist.
      </p>
      <div>
        <label className="f-label" style={{ color: "var(--ink-faint)" }}>
          File
        </label>
        <input
          type="file"
          required
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="mt-2 block w-full f-mono text-[13px] file:mr-3 file:py-2 file:px-3 file:border-0 file:bg-ink file:text-bone file:f-label hover:file:bg-ink-soft"
        />
        {file && (
          <div className="mt-2 f-mono text-[11px]" style={{ color: "var(--ink-faint)" }}>
            {file.name} · {(file.size / 1024).toFixed(1)} KB
          </div>
        )}
      </div>
      <div>
        <label className="f-label" style={{ color: "var(--ink-faint)" }}>
          Label (optional)
        </label>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="FLAC stems — session one"
          className="mt-2 w-full bg-transparent border-b border-rule outline-none py-2 f-body text-[15px] focus:border-vermillion"
        />
      </div>
      {err && (
        <div
          className="p-3 border f-mono text-[12px]"
          style={{ borderColor: "var(--vermillion)", color: "var(--vermillion)" }}
        >
          {err}
        </div>
      )}
      <div className="flex gap-3">
        <Button type="submit" variant="ink" size="sm" disabled={!file || uploading}>
          {uploading ? "Uploading…" : "Upload & attach"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
