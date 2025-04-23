import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { documentService } from '@/services/documentService';

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const id = params.id;
    
    if (!id) {
      return NextResponse.json(
        { message: 'Document ID is required' },
        { status: 400 }
      );
    }
    
    const document = await documentService.getDocumentById(id);
    
    if (!document) {
      return NextResponse.json(
        { message: 'Document not found' },
        { status: 404 }
      );
    }
    
    // Get file path
    const storageDir = process.env.DOCUMENT_STORAGE_PATH || './storage/documents';
    const filePath = join(storageDir, document.filePath);
    
    // Check if file exists
    if (!existsSync(filePath)) {
      return NextResponse.json(
        { message: 'Document file not found' },
        { status: 404 }
      );
    }
    
    // Read file
    const fileBuffer = await readFile(filePath);
    
    // Set headers for viewing (not downloading)
    const headers = new Headers();
    headers.set('Content-Type', document.fileType);
    headers.set('Content-Length', fileBuffer.length.toString());
    
    return new NextResponse(fileBuffer, { headers });
  } catch (error) {
    console.error('Error viewing document:', error);
    return NextResponse.json(
      { message: 'Failed to view document' },
      { status: 500 }
    );
  }
}