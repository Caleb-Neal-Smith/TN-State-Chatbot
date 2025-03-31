import { NextRequest, NextResponse } from 'next/server';
import { documentService } from '@/services/documentService';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Extract search parameters
    const {
      query = '',
      fileTypes = [],
      dateFrom,
      dateTo,
      page = 1,
      limit = 10,
      sortBy = 'uploadedAt',
      sortDirection = 'desc'
    } = data;
    
    // Validate parameters
    if (page < 1) {
      return NextResponse.json(
        { message: 'Page must be a positive integer' },
        { status: 400 }
      );
    }
    
    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { message: 'Limit must be between 1 and 100' },
        { status: 400 }
      );
    }
    
    // Convert date strings to Date objects if provided
    const dateRange = {
      from: dateFrom ? new Date(dateFrom) : undefined,
      to: dateTo ? new Date(dateTo) : undefined
    };
    
    // Perform search
    const { documents, total } = await documentService.searchDocuments({
      query,
      fileTypes,
      dateRange,
      pagination: {
        page,
        limit
      },
      sort: {
        field: sortBy,
        direction: sortDirection
      }
    });
    
    return NextResponse.json({ 
      documents, 
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error searching documents:', error);
    return NextResponse.json(
      { message: 'Failed to search documents' },
      { status: 500 }
    );
  }
}