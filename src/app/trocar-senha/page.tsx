import { requireUser } from "@/lib/auth";
import { ChangePasswordForm } from "./form";
import { AuthShell } from "../AuthShell";

export default async function TrocarSenha() {
  const user = await requireUser();
  return <AuthShell title={<>Uma senha <em>só sua</em>.</>}><ChangePasswordForm name={user.name.split(" ")[0]} forced={user.mustChangePassword} /></AuthShell>;
}
