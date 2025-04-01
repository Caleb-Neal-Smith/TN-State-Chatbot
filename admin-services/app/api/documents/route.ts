import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { documentService } from '@/services/documentService';

// GET /api/documents - List documents with pagination and search
export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const searchQuery = searchParams.get('q') || '';
    
    // Fetch documents with pagination and search
    const { documents, total } = await documentService.getDocuments({
      page,
      limit,
      searchQuery,
    });
    
    return NextResponse.json({ documents, total });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { message: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

// POST /api/documents - Upload a new document
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    
    if (!file) {
      return NextResponse.json(
        { message: 'No file provided' },
        { status: 400 }
      );
    }
    
    // Validate file size (20MB limit)
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json(
        { message: 'File size exceeds 20MB limit' },
        { status: 400 }
      );
    }
    
    // Get file extension and validate file type
    const fileName = file.name;
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
    const fileType = file.type;
    
    // Define allowed file types
    const allowedFileTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ];
    
    if (!allowedFileTypes.includes(fileType)) {
      return NextResponse.json(
        { message: 'File type not supported' },
        { status: 400 }
      );
    }
    
    // Create a unique ID for the document
    const documentId = uuidv4();
    
    // Determine storage directory (configurable for future flexibility)
    const storageDir = process.env.DOCUMENT_STORAGE_PATH || './storage/documents';
    
    // Create year/month-based directory structure for better organization
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    
    const relativeFilePath = `${year}/${month}`;
    const storagePath = join(storageDir, relativeFilePath);
    
    // Create storage directories if they don't exist
    if (!existsSync(storagePath)) {
      await mkdir(storagePath, { recursive: true });
    }
    
    // Create a unique filename with original extension
    const storedFileName = `${documentId}.${fileExtension}`;
    const filePath = join(storagePath, storedFileName);
    const relativeFilePath2 = join(relativeFilePath, storedFileName);
    
    // Save the file
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);
    
    // Save document metadata to database
    const document = await documentService.createDocument({
      id: documentId,
      name: name || fileName.split('.').slice(0, -1).join('.'), // Use filename without extension if name not provided
      description,
      fileType,
      filePath: relativeFilePath2,
      fileSize: file.size,
      uploadedAt: now,
      updatedAt: now
    });
    
    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error('Error uploading document:', error);
    return NextResponse.json(
      { message: 'Failed to upload document' },
      { status: 500 }
    );
  }
}