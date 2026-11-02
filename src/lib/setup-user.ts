import { db } from "./db";
import { DEFAULT_CATEGORIES } from "./categories";

export async function createDefaultCategories(userId: string) {
  for (const c of DEFAULT_CATEGORIES) {
    const parent = await db.category.create({ data: { userId, slug: c.slug, name: c.name, icon: c.icon, color: c.color, kind: c.kind } });
    if (c.subs?.length) await db.category.createMany({ data: c.subs.map((s) => ({ userId, slug: s.slug, name: s.name, icon: c.icon, color: c.color, kind: c.kind, parentId: parent.id })) });
  }
}
