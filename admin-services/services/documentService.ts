import { db } from './dbService';
import { Document } from '@/lib/types/documents';

// Types for document queries
interface GetDocumentsOptions {
  page: number;
  limit: number;
  searchQuery?: string;
}

interface SearchDocumentsOptions {
  query: string;
  fileTypes?: string[];
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  pagination: {
    page: number;
    limit: number;
  };
  sort: {
    field: string;
    direction: 'asc' | 'desc';
  };
}

class DocumentService {
  /**
   * Get documents with pagination and optional search
   */
  async getDocuments(options: GetDocumentsOptions): Promise<{ documents: Document[]; total: number }> {
    const { page, limit, searchQuery } = options;
    const offset = (page - 1) * limit;
    
    try {
      // Build search condition if search query is provided
      let whereClause = {};
      if (searchQuery) {
        whereClause = {
          OR: [
            { name: { contains: searchQuery, mode: 'insensitive' } },
            { description: { contains: searchQuery, mode: 'insensitive' } }
          ]
        };
      }
      
      // Get documents with pagination
      const documents = await db.document.findMany({
        where: whereClause,
        orderBy: { uploadedAt: 'desc' },
        skip: offset,
        take: limit,
      });
      
      // Get total count for pagination
      const total = await db.document.count({
        where: whereClause,
      });
      
      return { documents, total };
    } catch (error) {
      console.error('Error fetching documents:', error);
      throw new Error('Failed to fetch documents');
    }
  }
  
  /**
   * Get a document by ID
   */
  async getDocumentById(id: string): Promise<Document | null> {
    try {
      const document = await db.document.findUnique({
        where: { id },
      });
      
      return document;
    } catch (error) {
      console.error(`Error fetching document with ID ${id}:`, error);
      throw new Error('Failed to fetch document');
    }
  }
  
  /**
   * Create a new document
   */
  async createDocument(documentData: Document): Promise<Document> {
    try {
      const document = await db.document.create({
        data: documentData,
      });
      
      return document;
    } catch (error) {
      console.error('Error creating document:', error);
      throw new Error('Failed to create document');
    }
  }
  
  /**
   * Update an existing document
   */
  async updateDocument(id: string, data: Partial<Document>): Promise<Document> {
    try {
      const document = await db.document.update({
        where: { id },
        data,
      });
      
      return document;
    } catch (error) {
      console.error(`Error updating document with ID ${id}:`, error);
      throw new Error('Failed to update document');
    }
  }
  
  /**
   * Delete a document
   */
  async deleteDocument(id: string): Promise<void> {
    try {
      await db.document.delete({
        where: { id },
      });
    } catch (error) {
      console.error(`Error deleting document with ID ${id}:`, error);
      throw new Error('Failed to delete document');
    }
  }
  
  /**
   * Search documents with advanced filtering
   */
  async searchDocuments(options: SearchDocumentsOptions): Promise<{ documents: Document[]; total: number }> {
    const { query, fileTypes, dateRange, pagination, sort } = options;
    const { page, limit } = pagination;
    const offset = (page - 1) * limit;
    
    try {
      // Build where clause for search
      const whereClause: any = {};
      
      // Text search
      if (query) {
        whereClause.OR = [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } }
        ];
      }
      
      // File type filter
      if (fileTypes && fileTypes.length > 0) {
        whereClause.fileType = { in: fileTypes };
      }
      
      // Date range filter
      if (dateRange) {
        whereClause.uploadedAt = {};
        
        if (dateRange.from) {
          whereClause.uploadedAt.gte = dateRange.from;
        }
        
        if (dateRange.to) {
          whereClause.uploadedAt.lte = dateRange.to;
        }
      }
      
      // Get documents with filters, pagination, and sorting
      const documents = await db.document.findMany({
        where: whereClause,
        orderBy: { [sort.field]: sort.direction },
        skip: offset,
        take: limit,
      });
      
      // Get total count for pagination
      const total = await db.document.count({
        where: whereClause,
      });
      
      return { documents, total };
    } catch (error) {
      console.error('Error searching documents:', error);
      throw new Error('Failed to search documents');
    }
  }
}

export const documentService = new DocumentService();