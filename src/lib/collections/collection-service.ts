import "server-only";
import { prisma } from "@/lib/db/prisma";

export const COLLECTION_ITEM_TYPES = ["analysis", "prompt_variant", "generated_image"] as const;
export type CollectionItemType = (typeof COLLECTION_ITEM_TYPES)[number];

export function assertCollectionItemType(value: string): asserts value is CollectionItemType {
  if (!COLLECTION_ITEM_TYPES.includes(value as CollectionItemType)) {
    throw new Error("合集素材类型不支持");
  }
}

export async function assertCollectionItemExists(itemType: CollectionItemType, itemId: string) {
  if (itemType === "analysis") {
    const item = await prisma.promptAnalysis.findUnique({ where: { id: itemId }, select: { id: true } });
    if (!item) throw new Error("Prompt 分析记录不存在");
    return;
  }

  if (itemType === "prompt_variant") {
    const item = await prisma.promptVariant.findUnique({ where: { id: itemId }, select: { id: true } });
    if (!item) throw new Error("模板版本不存在");
    return;
  }

  const item = await prisma.generatedImage.findUnique({ where: { id: itemId }, select: { id: true } });
  if (!item) throw new Error("生成图不存在");
}

export function itemTypeLabel(itemType: string): string {
  if (itemType === "analysis") return "Prompt 分析";
  if (itemType === "prompt_variant") return "模板版本";
  if (itemType === "generated_image") return "生成图";
  return itemType;
}
