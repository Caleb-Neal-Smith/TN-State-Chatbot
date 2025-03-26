// Document type definition
export interface Document {
    id: string;
    name: string;
    description?: string;
    fileType: string;
    fileSize: number;
    filePath: string;
    uploadedAt: Date;
    updatedAt: Date;
  }
  
  // Query parameters for document listing
  export interface DocumentQueryParams {
    page?: number;
    limit?: number;
    searchQuery?: string;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
  }
  
  // Advanced search parameters
  export interface DocumentSearchParams {
    query?: string;
    fileTypes?: string[];
    dateFrom?: string | Date;
    dateTo?: string | Date;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
  }
  
  // Document response with pagination
  export interface DocumentPaginatedResponse {
    documents: Document[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }