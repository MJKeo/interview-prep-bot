"use server";

import { UAParser } from "ua-parser-js";
import { headers } from "next/headers";
import MobileNotSupportedScreen from "@/screens/mobile-not-supported-screen";
import HomeClient from "./home-client";

export default async function HomePage() {
  const headersList = await headers();
  const userAgent = headersList.get("user-agent") ?? "";
  const parser = UAParser(userAgent);
  const isMobile = parser.device.type === "mobile";

  if (isMobile) {
    // Mobile users see this immediately, no client-side flicker
    return <MobileNotSupportedScreen />;
  }

  // Non-mobile users get the full app (client component)
  return <HomeClient />;
}
