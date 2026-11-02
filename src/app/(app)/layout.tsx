import { redirect } from "next/navigation";
import { requireUser, isAdmin } from "@/lib/auth";
import { Nav } from "@/components/Nav";
import { VoiceButton } from "@/components/VoiceButton";
import { db } from "@/lib/db";
import { runAlerts } from "@/lib/alerts";
import { after } from "next/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (user.mustChangePassword) redirect("/trocar-senha");
  if (!user.onboarded) redirect("/onboarding");
  after(() => runAlerts(user.id).catch((e) => console.error("alerts", e)));
  const unread = await db.notification.count({ where: { userId: user.id, readAt: null } });
  return (
    <div className={user.hideValues ? "hide-values" : ""}>
      <Nav admin={isAdmin(user)} unread={unread} />
      <main className="mx-auto max-w-[1200px] px-5 pb-40 pt-5 md:ml-64 md:px-8 md:pb-12 md:pt-8">{children}</main>
      <VoiceButton variant="none" />
    </div>
  );
}
