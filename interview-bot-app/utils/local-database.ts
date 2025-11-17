import { type FileItem, FileStatus } from "@/types/file-item";

/**
 * Database name for IndexedDB storage
 */
const DB_NAME = "interview-bot-db";

/**
 * Database version - increment when schema changes
 */
const DB_VERSION = 1;

/**
 * Object store name for uploaded files
 */
const STORE_NAME = "uploaded-files";

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

            // Create object store if it doesn't exist
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                // Use 'id' as the key path for direct access by file ID
                db.createObjectStore(STORE_NAME, { keyPath: "id" });
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
        const transaction = db.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);

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
        const transaction = db.transaction([STORE_NAME], "readonly");
        const store = transaction.objectStore(STORE_NAME);

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
        const transaction = db.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);

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

