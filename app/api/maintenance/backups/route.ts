import { DIRS, listFiles } from "@/lib/maintenance/maintenance-service";

export async function GET() {
  const backups = (await listFiles(DIRS.backups)).filter((file) => file.filename.endsWith(".zip"));
  return Response.json({
    ok: true,
    backups: backups.map((backup) => ({
      ...backup,
      downloadUrl: `/api/maintenance/backups/${backup.filename}`,
    })),
  });
}
