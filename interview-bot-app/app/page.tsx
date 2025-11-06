import dotenv from "dotenv";
import EnterJobListingUrlScreen from "@/screens/enter-job-listing-url-screen";

// Load environment variables from the parent directory's .env file
dotenv.config({ path: "../.env" });

export default function Home() {
  return <EnterJobListingUrlScreen />;
}
