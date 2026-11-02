import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { handleUpload } from "@/lib/upload";

export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  const fd = await req.formData();
  const files = fd.getAll("files").filter((f): f is File => f instanceof File);
  return NextResponse.json({ results: await handleUpload(userId, files) });
}
