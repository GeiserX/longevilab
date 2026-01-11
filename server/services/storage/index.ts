import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export interface StorageService {
  upload(file: Buffer, filename: string): Promise<string>;
  download(path: string): Promise<Buffer>;
  delete(path: string): Promise<void>;
  getPath(storedPath: string): string;
}

const UPLOAD_DIR = process.env.STORAGE_LOCAL_PATH || "./uploads";

class LocalStorageService implements StorageService {
  private baseDir: string;

  constructor() {
    this.baseDir = path.resolve(UPLOAD_DIR);
  }

  async upload(file: Buffer, filename: string): Promise<string> {
    // Ensure upload directory exists
    await fs.mkdir(this.baseDir, { recursive: true });

    // Generate unique filename to avoid collisions
    const ext = path.extname(filename);
    const uniqueName = `${randomUUID()}${ext}`;
    const filePath = path.join(this.baseDir, uniqueName);

    await fs.writeFile(filePath, file);

    // Return relative path for storage in database
    return uniqueName;
  }

  async download(storedPath: string): Promise<Buffer> {
    const fullPath = path.join(this.baseDir, storedPath);
    return fs.readFile(fullPath);
  }

  async delete(storedPath: string): Promise<void> {
    const fullPath = path.join(this.baseDir, storedPath);
    try {
      await fs.unlink(fullPath);
    } catch (error) {
      // Ignore if file doesn't exist
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }

  getPath(storedPath: string): string {
    return path.join(this.baseDir, storedPath);
  }
}

// Factory function to get the appropriate storage service
function createStorageService(): StorageService {
  const storageType = process.env.STORAGE_TYPE || "local";

  switch (storageType) {
    case "local":
      return new LocalStorageService();
    case "s3":
      // S3 implementation can be added later
      throw new Error("S3 storage not yet implemented");
    default:
      return new LocalStorageService();
  }
}

// Export singleton instance
export const storage = createStorageService();
