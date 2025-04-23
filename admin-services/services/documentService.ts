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
  async deleteDocument(documentId: string): Promise<boolean> {
    try {
      // Get the document first to get the filename
      const document = await db.document.findUnique({
        where: { id: documentId },
      });
      
      if (!document) {
        console.error(`Document not found with ID: ${documentId}`);
        return false;
      }
      
      // Get the original filename
      const filename = document.name;
      
      // Delete the document from the database
      const dbResult = await db.document.delete({
        where: { id: documentId },
      });
      
      // Then delete the document's vectors from ChromaDB via the document processor
      const documentProcessorUrl = process.env.DOCUMENT_PROCESSOR_URL || 'http://document-processor:8001';
      const response = await fetch(`${documentProcessorUrl}/documents/${documentId}?filename=${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        console.error(`Error deleting document vectors: ${response.statusText}`);
        // Log the response body for debugging
        try {
          const errorBody = await response.text();
          console.error(`Error response body: ${errorBody}`);
        } catch (e) {
          console.error('Could not read error response body');
        }
        
        // We've still deleted from the database, so consider it a partial success
        return true;
      }
      
      const result = await response.json();
      console.log(`Document vectors deleted: ${JSON.stringify(result)}`);
      
      return true;
    } catch (error) {
      console.error(`Error deleting document: ${error}`);
      return false;
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