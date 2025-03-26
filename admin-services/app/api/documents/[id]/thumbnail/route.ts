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
    
    // In a real application, you would generate or retrieve a thumbnail for the document
    // For this example, we'll return a placeholder image based on file type
    
    // Determine placeholder image based on file type
    let placeholderImage = 'generic-document.png';
    
    if (document.fileType.includes('pdf')) {
      placeholderImage = 'pdf-document.png';
    } else if (document.fileType.includes('word')) {
      placeholderImage = 'word-document.png';
    } else if (document.fileType.includes('excel')) {
      placeholderImage = 'excel-document.png';
    } else if (document.fileType.includes('powerpoint')) {
      placeholderImage = 'powerpoint-document.png';
    } else if (document.fileType.includes('text')) {
      placeholderImage = 'text-document.png';
    }
    
    // Path to placeholder images (in a real app, you would generate actual thumbnails)
    const placeholderPath = join(process.cwd(), 'public', 'assets', 'placeholders', placeholderImage);
    
    // Use a default placeholder if the specific one doesn't exist
    const imgPath = existsSync(placeholderPath) 
      ? placeholderPath 
      : join(process.cwd(), 'public', 'assets', 'placeholders', 'generic-document.png');
    
    // Check if placeholder exists
    if (!existsSync(imgPath)) {
      // Return a fallback response if no placeholder images are available
      return NextResponse.json(
        { message: 'Thumbnail not available' },
        { status: 404 }
      );
    }
    
    // Read placeholder image
    const imageBuffer = await readFile(imgPath);
    
    // Determine image content type
    const imageType = placeholderImage.endsWith('.png') ? 'image/png' : 'image/jpeg';
    
    // Set headers for image
    const headers = new Headers();
    headers.set('Content-Type', imageType);
    headers.set('Content-Length', imageBuffer.length.toString());
    
    return new NextResponse(imageBuffer, { headers });
  } catch (error) {
    console.error('Error retrieving document thumbnail:', error);
    return NextResponse.json(
      { message: 'Failed to retrieve document thumbnail' },
      { status: 500 }
    );
  }
}