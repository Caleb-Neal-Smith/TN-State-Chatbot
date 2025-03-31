import { join, basename, dirname, extname } from 'path';
import { mkdir, writeFile, readFile, unlink, stat, access, constants } from 'fs/promises';
import { existsSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { sanitizeFileName } from '@/lib/utils/fileUtils';

class StorageService {
  private baseStoragePath: string;

  constructor() {
    // Get storage path from environment variables or use default
    this.baseStoragePath = process.env.DOCUMENT_STORAGE_PATH || './storage/documents';
  }

  /**
   * Save a file to storage
   * @param file File buffer to save
   * @param options Save options
   * @returns Object with file information
   */
  async saveFile(
    file: Buffer, 
    options: {
      originalFilename: string;
      mimeType: string;
      customFilename?: string;
      subDirectory?: string;
    }
  ): Promise<{
    id: string;
    filename: string;
    path: string;
    relativePath: string;
    size: number;
  }> {
    const { originalFilename, mimeType, customFilename, subDirectory } = options;
    
    // Generate unique ID for the file
    const fileId = uuidv4();
    
    // Use custom filename if provided, otherwise sanitize original filename
    let filename = customFilename || sanitizeFileName(originalFilename);
    
    // Get file extension
    const ext = extname(filename);
    
    // If no extension in the filename, try to add one based on mime type
    if (!ext) {
      const mimeExtMap: Record<string, string> = {
        'application/pdf': '.pdf',
        'application/msword': '.doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
        'text/plain': '.txt',
        'text/markdown': '.md',
        'application/vnd.ms-excel': '.xls',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
        'application/vnd.ms-powerpoint': '.ppt',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
      };
      
      const extension = mimeExtMap[mimeType] || '';
      filename = `${filename}${extension}`;
    }
    
    // Create year/month-based directory structure for better organization
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    
    // Determine storage path
    let storagePath = join(this.baseStoragePath, year.toString(), month);
    
    // Add additional subdirectory if specified
    if (subDirectory) {
      storagePath = join(storagePath, subDirectory);
    }
    
    // Create storage directories if they don't exist
    if (!existsSync(storagePath)) {
      await mkdir(storagePath, { recursive: true });
    }
    
    // Create a unique filename with original extension
    const storedFileName = `${fileId}${ext}`;
    const filePath = join(storagePath, storedFileName);
    
    // Save the file
    await writeFile(filePath, file);
    
    // Get file size
    const fileStats = await stat(filePath);
    
    // Calculate relative path from base storage path
    const relativePath = filePath.replace(this.baseStoragePath, '').replace(/^[\/\\]/, '');
    
    return {
      id: fileId,
      filename: storedFileName,
      path: filePath,
      relativePath,
      size: fileStats.size,
    };
  }

  /**
   * Read a file from storage
   * @param path Relative path to the file
   * @returns File buffer
   */
  async readFile(path: string): Promise<Buffer> {
    const fullPath = join(this.baseStoragePath, path);
    
    // Check if file exists
    try {
      await access(fullPath, constants.R_OK);
    } catch (error) {
      throw new Error(`File not found or not readable: ${path}`);
    }
    
    // Read and return file
    return readFile(fullPath);
  }

  /**
   * Delete a file from storage
   * @param path Relative path to the file
   * @returns Boolean indicating success
   */
  async deleteFile(path: string): Promise<boolean> {
    const fullPath = join(this.baseStoragePath, path);
    
    // Check if file exists
    try {
      await access(fullPath, constants.W_OK);
    } catch (error) {
      // File doesn't exist or is not writable
      return false;
    }
    
    // Delete file
    try {
      await unlink(fullPath);
      return true;
    } catch (error) {
      console.error(`Error deleting file ${path}:`, error);
      return false;
    }
  }

  /**
   * Get file information
   * @param path Relative path to the file
   * @returns Object with file information
   */
  async getFileInfo(path: string): Promise<{
    path: string;
    fullPath: string;
    size: number;
    createdAt: Date;
    modifiedAt: Date;
  } | null> {
    const fullPath = join(this.baseStoragePath, path);
    
    // Check if file exists
    try {
      await access(fullPath, constants.R_OK);
    } catch (error) {
      return null;
    }
    
    // Get file stats
    const fileStats = await stat(fullPath);
    
    return {
      path,
      fullPath,
      size: fileStats.size,
      createdAt: fileStats.birthtime,
      modifiedAt: fileStats.mtime,
    };
  }

  /**
   * Change base storage path (for configuration purposes)
   * @param newPath New base storage path
   */
  setStoragePath(newPath: string): void {
    this.baseStoragePath = newPath;
  }

  /**
   * Get current base storage path
   * @returns Current base storage path
   */
  getStoragePath(): string {
    return this.baseStoragePath;
  }
}

// Export singleton instance
export const storageService = new StorageService();