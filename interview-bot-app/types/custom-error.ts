/**
 * Custom error type for handling errors within client-facing components / screens.
 * Contains all the info needed to display to the user and allow retry's
 */
export type CustomError = {
    message: string;
    retryAction: (() => void) | null;
}