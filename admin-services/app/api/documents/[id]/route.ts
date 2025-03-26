import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { unlink } from 'fs/promises';
import { documentService } from '@/services/documentService';

// GET /api/documents/[id] - Get document by ID
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
    
    return NextResponse.json(document);
  } catch (error) {
    console.error('Error fetching document:', error);
    return NextResponse.json(
      { message: 'Failed to fetch document' },
      { status: 500 }
    );
  }
}

// DELETE /api/documents/[id] - Delete document by ID
export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const id = params.id;
    
    if (!id) {
      return NextResponse.json(
        { message: 'Document ID is required' },
        { status: 400 }
      );
    }
    
    // Get document before deletion
    const document = await documentService.getDocumentById(id);
    
    if (!document) {
      return NextResponse.json(
        { message: 'Document not found' },
        { status: 404 }
      );
    }
    
    // Delete document from database
    await documentService.deleteDocument(id);
    
    // Delete file from storage
    const storageDir = process.env.DOCUMENT_STORAGE_PATH || './storage/documents';
    const filePath = join(storageDir, document.filePath);
    
    try {
      await unlink(filePath);
    } catch (fileError) {
      console.error('Error deleting file:', fileError);
      // Continue even if file deletion fails
    }
    
    return NextResponse.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { message: 'Failed to delete document' },
      { status: 500 }
    );
  }
}

// PUT /api/documents/[id] - Update document by ID
export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
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
    
    const data = await request.json();
    
    // Only allow updating name and description
    const updatedDocument = await documentService.updateDocument(id, {
      name: data.name,
      description: data.description,
      updatedAt: new Date(),
    });
    
    return NextResponse.json(updatedDocument);
  } catch (error) {
    console.error('Error updating document:', error);
    return NextResponse.json(
      { message: 'Failed to update document' },
      { status: 500 }
    );
  }
}