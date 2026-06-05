import { readFile } from "node:fs/promises";
import { prisma } from "@/lib/db/prisma";
import { generatedImageContentType } from "@/lib/generation/image-generation-service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const image = await prisma.generatedImage.findUnique({
    where: { id },
  });

  if (!image) {
    return Response.json({ ok: false, error: "未找到生成图片记录" }, { status: 404 });
  }

  let file: Buffer;

  try {
    file = await readFile(image.localPath);
  } catch {
    return Response.json({ ok: false, error: "生成图片文件不存在" }, { status: 404 });
  }

  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": generatedImageContentType(image.format),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
