/**
 * Format file size in bytes to a human-readable string
 * @param bytes File size in bytes
 * @returns Formatted file size string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  /**
   * Format a date to a human-readable string
   * @param date Date to format
   * @returns Formatted date string
   */
  export function formatDate(date: Date | string | number): string {
    const dateObj = new Date(date);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - dateObj.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    // Format date based on how recent it is
    if (diffDays === 0) {
      // Today - show time
      return `Today at ${dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      // Yesterday
      return 'Yesterday';
    } else if (diffDays < 7) {
      // Within the last week
      return `${diffDays} days ago`;
    } else if (dateObj.getFullYear() === now.getFullYear()) {
      // This year, but more than a week ago
      return dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } else {
      // Different year
      return dateObj.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    }
  }
  
  /**
   * Get file extension from file name or path
   * @param filename File name or path
   * @returns File extension without the dot (e.g., "pdf" from "file.pdf")
   */
  export function getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }
  
  /**
   * Get MIME type from file extension
   * @param extension File extension without the dot (e.g., "pdf")
   * @returns MIME type (e.g., "application/pdf")
   */
  export function getMimeTypeFromExtension(extension: string): string {
    const mimeTypeMap: Record<string, string> = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      txt: 'text/plain',
      md: 'text/markdown',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      svg: 'image/svg+xml',
    };
    
    return mimeTypeMap[extension.toLowerCase()] || 'application/octet-stream';
  }
  
  /**
   * Get friendly file type name from MIME type
   * @param mimeType MIME type (e.g., "application/pdf")
   * @returns Human-readable file type name (e.g., "PDF Document")
   */
  export function getFileTypeFromMime(mimeType: string): string {
    const fileTypeMap: Record<string, string> = {
      'application/pdf': 'PDF Document',
      'application/msword': 'Word Document',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Document',
      'text/plain': 'Text Document',
      'text/markdown': 'Markdown Document',
      'application/vnd.ms-excel': 'Excel Spreadsheet',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel Spreadsheet',
      'application/vnd.ms-powerpoint': 'PowerPoint Presentation',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint Presentation',
      'image/jpeg': 'JPEG Image',
      'image/png': 'PNG Image',
      'image/gif': 'GIF Image',
      'image/svg+xml': 'SVG Image',
    };
    
    return fileTypeMap[mimeType] || 'Unknown Document Type';
  }
  
  /**
   * Check if file type is viewable in browser
   * @param mimeType MIME type (e.g., "application/pdf")
   * @returns Boolean indicating if the file can be viewed in browser
   */
  export function isViewableInBrowser(mimeType: string): boolean {
    const viewableTypes = [
      'application/pdf',
      'text/plain',
      'text/markdown',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/svg+xml',
    ];
    
    return viewableTypes.includes(mimeType);
  }
  
  /**
   * Sanitize file name to ensure it's safe for storage
   * @param filename Original file name
   * @returns Sanitized file name
   */
  export function sanitizeFileName(filename: string): string {
    // Remove any path traversal characters
    let sanitized = filename.replace(/\.{2,}|[\/\\]/g, '');
    
    // Replace any non-alphanumeric characters (except for periods, underscores, and hyphens)
    sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');
    
    return sanitized;
  }
  
  /**
   * Validate file size (e.g., against a maximum allowed size)
   * @param fileSize File size in bytes
   * @param maxSize Maximum allowed size in bytes (default: 20MB)
   * @returns Boolean indicating if the file size is valid
   */
  export function validateFileSize(fileSize: number, maxSize: number = 20 * 1024 * 1024): boolean {
    return fileSize > 0 && fileSize <= maxSize;
  }
  
  /**
   * Validate file type against a list of allowed MIME types
   * @param mimeType MIME type (e.g., "application/pdf")
   * @param allowedTypes Array of allowed MIME types
   * @returns Boolean indicating if the file type is allowed
   */
  export function validateFileType(mimeType: string, allowedTypes: string[]): boolean {
    return allowedTypes.includes(mimeType);
  }