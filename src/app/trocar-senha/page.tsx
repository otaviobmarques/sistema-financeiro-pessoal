import { requireUser } from "@/lib/auth";
import { ChangePasswordForm } from "./form";

export default async function TrocarSenha() {
  const user = await requireUser();
  return <ChangePasswordForm name={user.name.split(" ")[0]} forced={user.mustChangePassword} />;
}
