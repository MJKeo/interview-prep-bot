import "./enter_job_listing_url_screen.css";

/**
 * Screen component for entering a job listing URL.
 * Displays a single input textbox for users to enter the URL of their job listing.
 */
export default function EnterJobListingUrlScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <input
        type="text"
        placeholder="enter the url of your job listing"
        className="job-listing-url-input"
      />
    </div>
  );
}

