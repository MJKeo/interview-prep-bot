import { type FileItem, FileStatus } from "@/types/file-item";
import type { JobListingWithId } from "@/types/job-listing-data";

/**
 * Database name for IndexedDB storage
 */
const DB_NAME = "interview-bot-db";

/**
 * Database version - increment when schema changes
 */
const DB_VERSION = 3;

/**
 * Object store name for uploaded files
 */
const UPLOADED_FILES_STORE_NAME = "uploaded-files";

/**
 * Object store name for job listings
 */
const JOB_LISTINGS_STORE_NAME = "job-listings";

/**
 * Object store name for context distillation reports
 */
const CONTEXT_DISTILLATION_REPORTS_STORE_NAME = "context-distillation-reports";

/**
 * Opens or creates the IndexedDB database and returns a promise that resolves with the database instance.
 * Creates the object store if it doesn't exist.
 *
 * @returns Promise that resolves with the IDBDatabase instance
 * @throws Error if database opening fails
 */
function openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        // Handle database creation or upgrade
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;

            // Create object store for uploaded files if it doesn't exist
            if (!db.objectStoreNames.contains(UPLOADED_FILES_STORE_NAME)) {
                // Use 'id' as the key path for direct access by file ID
                db.createObjectStore(UPLOADED_FILES_STORE_NAME, { keyPath: "id" });
            }

            // Create object store for job listings if it doesn't exist
            if (!db.objectStoreNames.contains(JOB_LISTINGS_STORE_NAME)) {
                // Use 'id' as the key path for direct access by job listing ID
                db.createObjectStore(JOB_LISTINGS_STORE_NAME, { keyPath: "id" });
            }

            // Create object store for context distillation reports if it doesn't exist
            if (!db.objectStoreNames.contains(CONTEXT_DISTILLATION_REPORTS_STORE_NAME)) {
                // No keyPath - we'll use custom keys (concatenated file IDs)
                db.createObjectStore(CONTEXT_DISTILLATION_REPORTS_STORE_NAME);
            }
        };

        // Handle successful database opening
        request.onsuccess = () => {
            resolve(request.result);
        };

        // Handle database opening errors
        request.onerror = () => {
            reject(new Error(`Failed to open database: ${request.error?.message}`));
        };
    });
}

/**
 * Saves an uploaded file item to IndexedDB local storage.
 * The file item is stored as JSON in the 'uploaded-files' object store.
 *
 * @param fileItem - The FileItem to save to local storage
 * @returns Promise that resolves when the file item is successfully saved
 * @throws Error if the save operation fails
 *
 * @example
 * ```typescript
 * const fileItem: FileItem = {
 *   id: "123",
 *   fileName: "resume.pdf",
 *   status: FileStatus.SUCCESS,
 *   text: "File content..."
 * };
 * await saveUploadedFile(fileItem);
 * ```
 */
export async function saveUploadedFile(fileItem: FileItem): Promise<void> {
    const db = await openDatabase();
    console.log("Opened DB");

    return new Promise((resolve, reject) => {
        // Start a readwrite transaction to save the file item
        const transaction = db.transaction([UPLOADED_FILES_STORE_NAME], "readwrite");
        const store = transaction.objectStore(UPLOADED_FILES_STORE_NAME);

        // Serialize the file item to JSON and save it
        // IndexedDB will automatically serialize the object, but we ensure it's JSON-compatible
        const saveRequest = store.put(fileItem);

        // Handle successful save
        saveRequest.onsuccess = () => {
            console.log("File item saved successfully:", fileItem);
            resolve();
        };

        // Handle save errors
        saveRequest.onerror = () => {
            reject(
                new Error(
                    `Failed to save file item: ${saveRequest.error?.message}`
                )
            );
        };

        // Handle transaction errors
        transaction.onerror = () => {
            reject(
                new Error(
                    `Transaction failed: ${transaction.error?.message}`
                )
            );
        };
    });
}

/**
 * Validates that a value from IndexedDB matches the JobListingWithId type structure.
 * Ensures required fields are present and have the correct types.
 *
 * @param data - The data object to validate
 * @returns True if the data is a valid JobListingWithId, false otherwise
 */
function isValidJobListingWithId(data: unknown): data is JobListingWithId {
    if (!data || typeof data !== "object") {
        return false;
    }

    const item = data as Record<string, unknown>;

    // Validate required top-level fields
    if (typeof item.id !== "string" || !item.data || typeof item.data !== "object") {
        return false;
    }

    const itemData = item.data as Record<string, unknown>;

    // Validate required fields in data object
    if (
        typeof itemData["display-name"] !== "string" ||
        !itemData["listing-scrape-results"] ||
        typeof itemData["listing-scrape-results"] !== "object"
    ) {
        return false;
    }

    // Validate optional fields if present (must be correct type or null)
    if (
        itemData["deep-research-report"] !== null &&
        (typeof itemData["deep-research-report"] !== "object")
    ) {
        return false;
    }

    if (
        itemData["interview-guide"] !== null &&
        typeof itemData["interview-guide"] !== "string"
    ) {
        return false;
    }

    if (
        itemData.interviews !== null &&
        (typeof itemData.interviews !== "object" || Array.isArray(itemData.interviews))
    ) {
        return false;
    }

    return true;
}

/**
 * Validates that a value from IndexedDB matches the FileItem type structure.
 * Ensures required fields are present and status is a valid FileStatus enum value.
 *
 * @param data - The data object to validate
 * @returns True if the data is a valid FileItem, false otherwise
 */
function isValidFileItem(data: unknown): data is FileItem {
    if (!data || typeof data !== "object") {
        return false;
    }

    const item = data as Record<string, unknown>;

    // Validate required fields
    if (
        typeof item.id !== "string" ||
        typeof item.fileName !== "string" ||
        typeof item.status !== "string"
    ) {
        return false;
    }

    // Validate status is a valid FileStatus enum value
    const validStatuses = Object.values(FileStatus);
    if (!validStatuses.includes(item.status as FileStatus)) {
        return false;
    }

    // Validate optional fields if present
    if (item.errorMessage !== undefined && typeof item.errorMessage !== "string") {
        return false;
    }

    if (item.text !== undefined && typeof item.text !== "string") {
        return false;
    }

    return true;
}

/**
 * Fetches all saved file items from IndexedDB local storage.
 * Reads all records from the 'uploaded-files' object store and converts them
 * into FileItem instances, returning them as an array.
 *
 * @returns Promise that resolves with an array of FileItem instances
 * @throws Error if the fetch operation fails
 *
 * @example
 * ```typescript
 * const savedFiles = await fetchAllSavedFiles();
 * savedFiles.forEach(file => {
 *   console.log(`File: ${file.fileName}, Status: ${file.status}`);
 * });
 * ```
 */
export async function fetchAllSavedFiles(): Promise<FileItem[]> {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        // Start a readonly transaction to fetch all file items
        const transaction = db.transaction([UPLOADED_FILES_STORE_NAME], "readonly");
        const store = transaction.objectStore(UPLOADED_FILES_STORE_NAME);

        // Request all records from the object store
        const getAllRequest = store.getAll();

        // Handle successful fetch
        getAllRequest.onsuccess = () => {
            const results = getAllRequest.result;

            // Convert and validate each fetched item as a FileItem instance
            const fileItems: FileItem[] = results
                .filter(isValidFileItem)
                .map((item) => ({
                    id: item.id,
                    fileName: item.fileName,
                    status: FileStatus.SAVED,
                    ...(item.errorMessage && { errorMessage: item.errorMessage }),
                    ...(item.text && { text: item.text }),
                }));

            resolve(fileItems);
        };

        // Handle fetch errors
        getAllRequest.onerror = () => {
            reject(
                new Error(
                    `Failed to fetch file items: ${getAllRequest.error?.message}`
                )
            );
        };

        // Handle transaction errors
        transaction.onerror = () => {
            reject(
                new Error(
                    `Transaction failed: ${transaction.error?.message}`
                )
            );
        };
    });
}

/**
 * Deletes a saved file item from IndexedDB local storage.
 * Attempts to find and delete a FileItem with the same id as the provided fileItem.
 * If no file exists with that id, the operation completes successfully without error.
 *
 * @param fileItem - The FileItem to delete (uses the id property to identify the record)
 * @returns Promise that resolves when the delete operation completes (even if the item didn't exist)
 * @throws Error if the delete operation fails due to database errors
 *
 * @example
 * ```typescript
 * const fileItem: FileItem = {
 *   id: "123",
 *   fileName: "resume.pdf",
 *   status: FileStatus.SUCCESS
 * };
 * await deleteSavedFileItem(fileItem);
 * ```
 */
export async function deleteSavedFileItem(fileItem: FileItem): Promise<void> {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        // Start a readwrite transaction to delete the file item
        const transaction = db.transaction([UPLOADED_FILES_STORE_NAME], "readwrite");
        const store = transaction.objectStore(UPLOADED_FILES_STORE_NAME);

        // Delete the file item by its id
        // If the item doesn't exist, the delete operation still succeeds (no error)
        const deleteRequest = store.delete(fileItem.id);

        // Handle successful delete (even if item didn't exist)
        deleteRequest.onsuccess = () => {
            resolve();
        };

        // Handle delete errors (only for actual database errors, not missing items)
        deleteRequest.onerror = () => {
            reject(
                new Error(
                    `Failed to delete file item: ${deleteRequest.error?.message}`
                )
            );
        };

        // Handle transaction errors
        transaction.onerror = () => {
            reject(
                new Error(
                    `Transaction failed: ${transaction.error?.message}`
                )
            );
        };
    });
}

/**
 * Saves a job listing to IndexedDB local storage.
 * If a job listing with the same ID already exists, it will be updated/overwritten.
 * If no job listing with that ID exists, a new one will be created.
 * Uses IndexedDB's put() method which performs an "upsert" operation (insert or update).
 *
 * @param jobListingData - The JobListingWithId to save in the database
 * @returns Promise that resolves when the job listing is successfully saved or updated
 * @throws Error if the save operation fails
 */
export async function saveJobListing(
    jobListingData: JobListingWithId
): Promise<void> {
    try {
        const db = await openDatabase();

        return new Promise((resolve, reject) => {
            // Start a readwrite transaction to save the job listing
            const transaction = db.transaction([JOB_LISTINGS_STORE_NAME], "readwrite");
            const store = transaction.objectStore(JOB_LISTINGS_STORE_NAME);

            // Use put() to save or update the job listing
            // put() will insert if the ID doesn't exist, or update if it does
            const saveRequest = store.put(jobListingData);

            // Handle successful save/update
            saveRequest.onsuccess = () => {
                console.log("Job listing saved/updated successfully:", jobListingData);
                resolve();
            };

            // Handle save errors
            saveRequest.onerror = () => {
                console.error(
                    "Failed to save/update job listing:",
                    saveRequest.error?.message
                );
                reject(
                    new Error(
                        `Failed to save/update job listing: ${saveRequest.error?.message}`
                    )
                );
            };

            // Handle transaction errors
            transaction.onerror = () => {
                console.error(
                    "Transaction failed while saving/updating job listing:",
                    transaction.error?.message
                );
                reject(
                    new Error(
                        `Transaction failed: ${transaction.error?.message}`
                    )
                );
            };
        });
    } catch (error) {
        // Handle any errors that occur during the save process
        console.error("Failed to save/update job listing:", error);
        throw error;
    }
}

/**
 * Fetches all saved job listings from IndexedDB local storage.
 * Reads all records from the 'job-listings' object store and converts them
 * into JobListingWithId instances, returning them as an array.
 *
 * @returns Promise that resolves with an array of JobListingWithId instances
 * @throws Error if the fetch operation fails
 *
 * @example
 * ```typescript
 * const jobListings = await fetchAllJobListings();
 * jobListings.forEach(listing => {
 *   console.log(`Job Listing: ${listing.data["display-name"]}, ID: ${listing.id}`);
 * });
 * ```
 */
export async function fetchAllJobListings(): Promise<JobListingWithId[]> {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        // Start a readonly transaction to fetch all job listings
        const transaction = db.transaction([JOB_LISTINGS_STORE_NAME], "readonly");
        const store = transaction.objectStore(JOB_LISTINGS_STORE_NAME);

        // Request all records from the object store
        const getAllRequest = store.getAll();

        // Handle successful fetch
        getAllRequest.onsuccess = () => {
            const results = getAllRequest.result;

            // Convert and validate each fetched item as a JobListingWithId instance
            const jobListings: JobListingWithId[] = results.filter(
                isValidJobListingWithId
            );

            resolve(jobListings);
        };

        // Handle fetch errors
        getAllRequest.onerror = () => {
            reject(
                new Error(
                    `Failed to fetch job listings: ${getAllRequest.error?.message}`
                )
            );
        };

        // Handle transaction errors
        transaction.onerror = () => {
            reject(
                new Error(
                    `Transaction failed: ${transaction.error?.message}`
                )
            );
        };
    });
}

/**
 * Deletes a job listing from IndexedDB local storage.
 * Attempts to find and delete a job listing with the same id as the provided jobListing.
 * If no job listing exists with that id, the operation completes successfully without error.
 *
 * @param jobListing - The JobListingWithId to delete (uses the id property to identify the record)
 * @returns Promise that resolves when the delete operation completes (even if the item didn't exist)
 * @throws Error if the delete operation fails due to database errors
 *
 * @example
 * ```typescript
 * const jobListing: JobListingWithId = {
 *   id: "123",
 *   data: {
 *     "display-name": "Software Engineer",
 *     "listing-scrape-results": { ... },
 *     "deep-research-report": null,
 *     "interview-guide": null,
 *     interviews: null
 *   }
 * };
 * await deleteJobListing(jobListing);
 * ```
 */
export async function deleteJobListing(
    jobListing: JobListingWithId
): Promise<void> {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        // Start a readwrite transaction to delete the job listing
        const transaction = db.transaction([JOB_LISTINGS_STORE_NAME], "readwrite");
        const store = transaction.objectStore(JOB_LISTINGS_STORE_NAME);

        // Delete the job listing by its id
        // If the item doesn't exist, the delete operation still succeeds (no error)
        const deleteRequest = store.delete(jobListing.id);

        // Handle successful delete (even if item didn't exist)
        deleteRequest.onsuccess = () => {
            resolve();
        };

        // Handle delete errors (only for actual database errors, not missing items)
        deleteRequest.onerror = () => {
            reject(
                new Error(
                    `Failed to delete job listing: ${deleteRequest.error?.message}`
                )
            );
        };

        // Handle transaction errors
        transaction.onerror = () => {
            reject(
                new Error(
                    `Transaction failed: ${transaction.error?.message}`
                )
            );
        };
    });
}

/**
 * Saves a user context guide to IndexedDB local storage.
 * Creates a unique key by sorting all file IDs alphabetically and concatenating them.
 * The userContextGuide string is stored as the value for this key in the context-distillation-reports store.
 * If a context guide with the same key already exists, it will be updated/overwritten.
 *
 * @param userFiles - Array of FileItem instances whose IDs will be used to generate the key
 * @param userContextGuide - The context guide string to save
 * @returns Promise that resolves when the context guide is successfully saved
 * @throws Error if the save operation fails
 *
 * @example
 * ```typescript
 * const userFiles: FileItem[] = [
 *   { id: "file-2", fileName: "resume.pdf", status: FileStatus.SUCCESS },
 *   { id: "file-1", fileName: "cover-letter.pdf", status: FileStatus.SUCCESS }
 * ];
 * const guide = "User has 5 years of experience...";
 * await saveUserContext(userFiles, guide);
 * // Saves with key "file-1file-2" (sorted IDs concatenated)
 * ```
 */
export async function saveUserContext(
    userFiles: FileItem[],
    userContextGuide: string
): Promise<void> {
    try {
        const db = await openDatabase();

        // Generate key by extracting IDs, sorting alphabetically, and concatenating
        const key = createUserContextKey(userFiles);

        return new Promise((resolve, reject) => {
            // Start a readwrite transaction to save the context guide
            const transaction = db.transaction(
                [CONTEXT_DISTILLATION_REPORTS_STORE_NAME],
                "readwrite"
            );
            const store = transaction.objectStore(
                CONTEXT_DISTILLATION_REPORTS_STORE_NAME
            );

            // Use put() to save or update the context guide with the generated key
            // put() will insert if the key doesn't exist, or update if it does
            const saveRequest = store.put(userContextGuide, key);

            // Handle successful save/update
            saveRequest.onsuccess = () => {
                console.log(
                    "User context guide saved/updated successfully with key:",
                    key
                );
                resolve();
            };

            // Handle save errors
            saveRequest.onerror = () => {
                console.error(
                    "Failed to save/update user context guide:",
                    saveRequest.error?.message
                );
                reject(
                    new Error(
                        `Failed to save/update user context guide: ${saveRequest.error?.message}`
                    )
                );
            };

            // Handle transaction errors
            transaction.onerror = () => {
                console.error(
                    "Transaction failed while saving/updating user context guide:",
                    transaction.error?.message
                );
                reject(
                    new Error(
                        `Transaction failed: ${transaction.error?.message}`
                    )
                );
            };
        });
    } catch (error) {
        // Handle any errors that occur during the save process
        console.error("Failed to save/update user context guide:", error);
        throw error;
    }
}

/**
 * Fetches a user context guide from IndexedDB local storage.
 * Generates a key from the provided userFiles by sorting their IDs alphabetically and concatenating them.
 * Returns the context guide string if found, or null if no context guide exists for that key.
 *
 * @param userFiles - Array of FileItem instances whose IDs will be used to generate the lookup key
 * @returns Promise that resolves with the context guide string if found, or null if not found
 * @throws Error if the fetch operation fails
 *
 * @example
 * ```typescript
 * const userFiles: FileItem[] = [
 *   { id: "file-2", fileName: "resume.pdf", status: FileStatus.SUCCESS },
 *   { id: "file-1", fileName: "cover-letter.pdf", status: FileStatus.SUCCESS }
 * ];
 * const guide = await getUserContext(userFiles);
 * // Returns the saved context guide string or null if not found
 * ```
 */
export async function getSavedUserContext(
    userFiles: FileItem[]
): Promise<string | null> {
    try {
        const db = await openDatabase();

        // Generate key by extracting IDs, sorting alphabetically, and concatenating
        const key = createUserContextKey(userFiles);

        return new Promise((resolve, reject) => {
            // Start a readonly transaction to fetch the context guide
            const transaction = db.transaction(
                [CONTEXT_DISTILLATION_REPORTS_STORE_NAME],
                "readonly"
            );
            const store = transaction.objectStore(
                CONTEXT_DISTILLATION_REPORTS_STORE_NAME
            );

            // Get the context guide by its key
            const getRequest = store.get(key);

            // Handle successful fetch
            getRequest.onsuccess = () => {
                // If the key doesn't exist, result will be undefined
                // Convert undefined to null for consistency
                const result = getRequest.result ?? null;
                resolve(result);
            };

            // Handle fetch errors
            getRequest.onerror = () => {
                console.error(
                    "Failed to fetch user context guide:",
                    getRequest.error?.message
                );
                reject(
                    new Error(
                        `Failed to fetch user context guide: ${getRequest.error?.message}`
                    )
                );
            };

            // Handle transaction errors
            transaction.onerror = () => {
                console.error(
                    "Transaction failed while fetching user context guide:",
                    transaction.error?.message
                );
                reject(
                    new Error(
                        `Transaction failed: ${transaction.error?.message}`
                    )
                );
            };
        });
    } catch (error) {
        // Handle any errors that occur during the fetch process
        console.error("Failed to fetch user context guide:", error);
        throw error;
    }
}

function createUserContextKey(userFiles: FileItem[]): string {
    const fileIds = userFiles.map((file) => file.id).sort();
    return fileIds.join("");
}

