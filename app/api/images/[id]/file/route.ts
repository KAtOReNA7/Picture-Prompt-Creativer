import { readFile } from "node:fs/promises";
import { prisma } from "@/lib/db/prisma";

function jsonError(message: string, status = 404): Response {
  return Response.json({ ok: false, error: message }, { status });
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const image = await prisma.imageAsset.findUnique({
    where: { id },
    select: {
      localPath: true,
      mimeType: true,
      originalName: true,
    },
  });

  if (!image) {
    return jsonError("图片记录不存在");
  }

  try {
    const file = await readFile(image.localPath);
    return new Response(file, {
      headers: {
        "Content-Type": image.mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(image.originalName)}"`,
      },
    });
  } catch {
    return jsonError("文件不存在");
  }
}
