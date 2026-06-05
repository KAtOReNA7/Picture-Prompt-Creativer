import { prisma } from "@/lib/db/prisma";

type TagBody = {
  name?: unknown;
  color?: unknown;
  description?: unknown;
};

function stringValue(value: unknown): string | null {
  return typeof value === "string" ? value.trim() : null;
}

export async function GET() {
  const tags = await prisma.tag.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { analyses: true },
      },
    },
  });

  return Response.json({
    ok: true,
    tags: tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      color: tag.color,
      description: tag.description,
      createdAt: tag.createdAt.toISOString(),
      analysisCount: tag._count.analyses,
    })),
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TagBody;
    const name = stringValue(body.name);

    if (!name) {
      throw new Error("标签名称必填");
    }

    const existing = await prisma.tag.findUnique({ where: { name } });
    if (existing) {
      throw new Error("标签名称已存在");
    }

    const tag = await prisma.tag.create({
      data: {
        name,
        color: stringValue(body.color),
        description: stringValue(body.description),
      },
    });

    return Response.json({ ok: true, tag: { ...tag, createdAt: tag.createdAt.toISOString(), analysisCount: 0 } });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "创建标签失败" }, { status: 400 });
  }
}
