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
    
    // Determine filename for download
    const fileExtension = document.filePath.split('.').pop();
    const downloadFilename = `${document.name}.${fileExtension}`;
    
    // Set headers for download
    const headers = new Headers();
    headers.set('Content-Type', document.fileType);
    headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(downloadFilename)}"`);
    headers.set('Content-Length', fileBuffer.length.toString());
    
    return new NextResponse(fileBuffer, { headers });
  } catch (error) {
    console.error('Error downloading document:', error);
    return NextResponse.json(
      { message: 'Failed to download document' },
      { status: 500 }
    );
  }
}