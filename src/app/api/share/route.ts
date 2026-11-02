// Web Share Target (RF-039): o PWA aparece no "Compartilhar" do celular.
import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { handleUpload } from "@/lib/upload";

export async function POST(req: Request) {
  const userId = await currentUserId();
  const base = new URL(req.url).origin;
  if (!userId) return NextResponse.redirect(`${base}/entrar?next=/comprovantes`, 303);
  const fd = await req.formData();
  const files = fd.getAll("files").filter((f): f is File => f instanceof File);
  await handleUpload(userId, files);
  return NextResponse.redirect(`${base}/comprovantes?compartilhado=${files.length}`, 303);
}
