import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { OnboardingForm } from "./form";

export default async function Page() {
  const user = await requireUser();
  if (user.onboarded) redirect("/inicio");
  return <OnboardingForm name={user.name} />;
}
