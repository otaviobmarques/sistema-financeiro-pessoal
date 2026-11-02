import { redirect } from "next/navigation";
import { requireUser, isAdmin } from "@/lib/auth";
import { Nav } from "@/components/Nav";
import { VoiceButton } from "@/components/VoiceButton";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (user.mustChangePassword) redirect("/trocar-senha");
  if (!user.onboarded) redirect("/onboarding");
  return (
    <div className={user.hideValues ? "hide-values" : ""}>
      <Nav admin={isAdmin(user)} />
      <main className="mx-auto max-w-5xl px-4 pb-32 pt-4 md:ml-60 md:pb-12 md:pt-8 lg:ml-auto lg:pl-64">{children}</main>
      <VoiceButton />
    </div>
  );
}
