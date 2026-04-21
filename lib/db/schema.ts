import {
  pgTable,
  pgEnum,
  text,
  varchar,
  timestamp,
  integer,
  bigint,
  jsonb,
  uuid,
  boolean,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

export const pluginIdEnum = pgEnum("plugin_id", [
  "web",
  "files",
  "telegram",
  "email",
]);

export const grantStatusEnum = pgEnum("grant_status", [
  "active",
  "revoked",
  "error",
]);

export const creators = pgTable(
  "creators",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    handle: varchar("handle", { length: 64 }).notNull().unique(),
    displayName: varchar("display_name", { length: 120 }).notNull(),
    tagline: varchar("tagline", { length: 240 }),
    bio: text("bio"),
    wallet: varchar("wallet", { length: 64 }).notNull(),
    tokenMint: varchar("token_mint", { length: 64 }),
    tokenTicker: varchar("token_ticker", { length: 24 }),
    tokenName: varchar("token_name", { length: 120 }),
    tokenImageUrl: text("token_image_url"),
    tokenDecimals: integer("token_decimals").default(9),
    partnerBps: integer("partner_bps").default(100),
    accentColor: varchar("accent_color", { length: 16 }).default("#C1272D"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    walletIdx: index("creators_wallet_idx").on(t.wallet),
    mintIdx: index("creators_mint_idx").on(t.tokenMint),
  }),
);

export const tiers = pgTable(
  "tiers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    creatorId: uuid("creator_id")
      .references(() => creators.id, { onDelete: "cascade" })
      .notNull(),
    name: varchar("name", { length: 64 }).notNull(),
    description: text("description"),
    threshold: bigint("threshold", { mode: "bigint" }).notNull(),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    creatorIdx: index("tiers_creator_idx").on(t.creatorId, t.position),
  }),
);

export const perks = pgTable(
  "perks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tierId: uuid("tier_id")
      .references(() => tiers.id, { onDelete: "cascade" })
      .notNull(),
    pluginId: pluginIdEnum("plugin_id").notNull(),
    config: jsonb("config").notNull().$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    tierIdx: index("perks_tier_idx").on(t.tierId),
  }),
);

export const holders = pgTable(
  "holders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    wallet: varchar("wallet", { length: 64 }).notNull(),
    creatorId: uuid("creator_id")
      .references(() => creators.id, { onDelete: "cascade" })
      .notNull(),
    currentTierId: uuid("current_tier_id").references(() => tiers.id, {
      onDelete: "set null",
    }),
    lastBalance: bigint("last_balance", { mode: "bigint" }).default(sql`0`),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    walletCreatorUniq: unique("holders_wallet_creator_uniq").on(
      t.wallet,
      t.creatorId,
    ),
    walletIdx: index("holders_wallet_idx").on(t.wallet),
  }),
);

export const grants = pgTable(
  "grants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    holderId: uuid("holder_id")
      .references(() => holders.id, { onDelete: "cascade" })
      .notNull(),
    tierId: uuid("tier_id")
      .references(() => tiers.id, { onDelete: "cascade" })
      .notNull(),
    pluginId: pluginIdEnum("plugin_id").notNull(),
    externalRef: varchar("external_ref", { length: 256 }),
    status: grantStatusEnum("status").notNull().default("active"),
    grantedAt: timestamp("granted_at", { withTimezone: true }).defaultNow().notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    error: text("error"),
  },
  (t) => ({
    holderIdx: index("grants_holder_idx").on(t.holderId),
  }),
);

export const files = pgTable("files", {
  id: uuid("id").defaultRandom().primaryKey(),
  tierId: uuid("tier_id")
    .references(() => tiers.id, { onDelete: "cascade" })
    .notNull(),
  filename: varchar("filename", { length: 256 }).notNull(),
  storageKey: text("storage_key").notNull(),
  contentType: varchar("content_type", { length: 128 }),
  sizeBytes: bigint("size_bytes", { mode: "bigint" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const webContent = pgTable("web_content", {
  id: uuid("id").defaultRandom().primaryKey(),
  tierId: uuid("tier_id")
    .references(() => tiers.id, { onDelete: "cascade" })
    .notNull(),
  kind: varchar("kind", { length: 32 }).notNull(),
  url: text("url").notNull(),
  title: varchar("title", { length: 240 }),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const nonces = pgTable("nonces", {
  wallet: varchar("wallet", { length: 64 }).notNull(),
  nonce: varchar("nonce", { length: 64 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  wallet: varchar("wallet", { length: 64 }).notNull(),
  role: varchar("role", { length: 16 }).notNull().default("holder"),
  creatorId: uuid("creator_id").references(() => creators.id, {
    onDelete: "cascade",
  }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const creatorsRelations = relations(creators, ({ many }) => ({
  tiers: many(tiers),
  holders: many(holders),
}));

export const tiersRelations = relations(tiers, ({ one, many }) => ({
  creator: one(creators, {
    fields: [tiers.creatorId],
    references: [creators.id],
  }),
  perks: many(perks),
  files: many(files),
  webContent: many(webContent),
}));

export const perksRelations = relations(perks, ({ one }) => ({
  tier: one(tiers, { fields: [perks.tierId], references: [tiers.id] }),
}));

export const holdersRelations = relations(holders, ({ one, many }) => ({
  creator: one(creators, {
    fields: [holders.creatorId],
    references: [creators.id],
  }),
  tier: one(tiers, {
    fields: [holders.currentTierId],
    references: [tiers.id],
  }),
  grants: many(grants),
}));

export const grantsRelations = relations(grants, ({ one }) => ({
  holder: one(holders, {
    fields: [grants.holderId],
    references: [holders.id],
  }),
  tier: one(tiers, { fields: [grants.tierId], references: [tiers.id] }),
}));

export type Creator = typeof creators.$inferSelect;
export type NewCreator = typeof creators.$inferInsert;
export type Tier = typeof tiers.$inferSelect;
export type NewTier = typeof tiers.$inferInsert;
export type Perk = typeof perks.$inferSelect;
export type NewPerk = typeof perks.$inferInsert;
export type Holder = typeof holders.$inferSelect;
export type NewHolder = typeof holders.$inferInsert;
export type Grant = typeof grants.$inferSelect;
export type NewGrant = typeof grants.$inferInsert;
