enum FileStatus {
    LOADING = "loading",
    SUCCESS = "success",
    ERROR = "error",
    SAVED = "saved",
}

type FileItem = {
    id: string;
    fileName: string;
    status: FileStatus;
    errorMessage?: string;
    text?: string;
};

type UploadedFileItem = FileItem & {
    originalFile: File;
};

export { FileStatus, type FileItem, type UploadedFileItem };