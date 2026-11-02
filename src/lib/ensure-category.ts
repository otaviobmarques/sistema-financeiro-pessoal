import { db } from "./db";
import { DEFAULT_CATEGORIES } from "./categories";

/** Garante uma categoria padrao para usuarios criados antes dela existir. */
export async function ensureCategory(userId: string, slug: string) {
  const found = await db.category.findUnique({ where: { userId_slug: { userId, slug } } });
  if (found) return found;
  const parentDef = DEFAULT_CATEGORIES.find((c) => c.slug === slug.split(".")[0])!;
  const parent = await db.category.upsert({ where: { userId_slug: { userId, slug: parentDef.slug } }, update: {}, create: { userId, slug: parentDef.slug, name: parentDef.name, icon: parentDef.icon, color: parentDef.color, kind: parentDef.kind } });
  const sub = parentDef.subs!.find((x) => x.slug === slug)!;
  return db.category.create({ data: { userId, slug, name: sub.name, icon: parentDef.icon, color: parentDef.color, kind: parentDef.kind, parentId: parent.id } });
}
