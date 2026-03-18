import { redirect } from "next/navigation";
import { appRoutes } from "@/config";

export default function HomePage() {
  redirect(appRoutes.login);
}
