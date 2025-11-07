/**
 * Validates if a string is a syntactically valid URL.
 * Checks that the URL has proper syntax (protocol, domain, etc.)
 * but does not verify if the URL actually exists or is reachable.
 * 
 * @param urlString - The string to validate as a URL
 * @returns true if the string is a valid URL syntax, false otherwise
 */
export function isValidURL(urlString: string): boolean {
  // Check if the string is empty or only whitespace
  if (!urlString) {
    return false;
  }

  try {
    // Use the URL constructor to validate the URL syntax
    // This will throw an error if the URL is malformed
    const url = new URL(urlString);
    
    // Ensure the URL has a valid protocol (http or https)
    // This prevents things like "javascript:" or other non-web protocols
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (error) {
    // If URL constructor throws an error, the URL is invalid
    return false;
  }
}

