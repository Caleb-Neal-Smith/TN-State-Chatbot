import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { documentService } from '@/services/documentService';

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const id = await params.id;
    
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
    
    // Only allow text content for certain file types
    const textFileTypes = ['text/plain', 'text/markdown'];
    if (!textFileTypes.includes(document.fileType)) {
      return NextResponse.json(
        { message: 'Content retrieval not supported for this file type' },
        { status: 400 }
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
    
    // Read file as text
    const fileContent = await readFile(filePath, 'utf-8');
    
    // Set headers for text content
    const headers = new Headers();
    headers.set('Content-Type', 'text/plain; charset=utf-8');
    
    return new NextResponse(fileContent, { headers });
  } catch (error) {
    console.error('Error retrieving document content:', error);
    return NextResponse.json(
      { message: 'Failed to retrieve document content' },
      { status: 500 }
    );
  }
}