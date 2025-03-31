'use client';

import { useState, useEffect } from 'react';
import { Loader2, FileWarning } from 'lucide-react';

interface DocumentViewerClientProps {
  documentId: string;
  fileType: string;
}

export default function DocumentViewerClient({ 
  documentId, 
  fileType 
}: DocumentViewerClientProps) {
  const [viewerUrl, setViewerUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error] = useState<string | null>(null);
  
  useEffect(() => {
    // Generate a secured, temporary URL for viewing the document
    setViewerUrl(`/api/documents/${documentId}/view`);
    setIsLoading(false);
  }, [documentId]);
  
  // Function to determine the correct viewer to use based on file type
  const renderViewer = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <Loader2 size={32} className="animate-spin text-gray-400" />
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center">
          <FileWarning size={48} className="text-red-500 mb-4" />
          <h3 className="text-xl font-semibold mb-2">Preview Error</h3>
          <p className="text-gray-600">{error}</p>
        </div>
      );
    }
    
    // Handle PDF files
    if (fileType === 'application/pdf') {
      return (
        <iframe 
          src={viewerUrl} 
          className="w-full h-full border-0"
          title="PDF Viewer"
        />
      );
    }
    
    // Handle text and markdown files
    if (fileType === 'text/plain' || fileType === 'text/markdown') {
      return <TextPreview documentId={documentId} />;
    }
    
    // Handle Office documents (Word, Excel, PowerPoint)
    if (
      fileType === 'application/msword' || 
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileType === 'application/vnd.ms-excel' ||
      fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      fileType === 'application/vnd.ms-powerpoint' ||
      fileType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ) {
      return <OfficePreview documentId={documentId} fileType={fileType} />;
    }
    
    // Fallback for unsupported file types
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <FileWarning size={48} className="text-amber-500 mb-4" />
        <h3 className="text-xl font-semibold mb-2">Preview Not Available</h3>
        <p className="text-gray-600">This file type cannot be previewed. Please download the file to view its contents.</p>
      </div>
    );
  };
  
  return (
    <div className="w-full h-full">
      {renderViewer()}
    </div>
  );
}

// Component for rendering text files
function TextPreview({ documentId }: { documentId: string }) {
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchTextContent = async () => {
      try {
        const response = await fetch(`/api/documents/${documentId}/content`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch document content');
        }
        
        const text = await response.text();
        setContent(text);
      } catch (error) {
        console.error('Error loading text content:', error);
        setError(error instanceof Error ? error.message : 'Failed to load document content');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTextContent();
  }, [documentId]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={32} className="animate-spin text-gray-400" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <FileWarning size={48} className="text-red-500 mb-4" />
        <h3 className="text-xl font-semibold mb-2">Preview Error</h3>
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }
  
  return (
    <div className="p-6 h-full overflow-auto">
      <pre className="whitespace-pre-wrap font-mono text-sm">{content}</pre>
    </div>
  );
}

// Component for rendering Office documents
function OfficePreview({ documentId, fileType }: { documentId: string; fileType: string }) {
  // For Office documents, we'll use a hybrid approach:
  // 1. For supported browsers, use the Microsoft Office Online viewer
  // 2. For unsupported browsers or if the service is unavailable, show a thumbnail and download prompt
  
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchThumbnail = async () => {
      try {
        setThumbnail(`/api/documents/${documentId}/thumbnail`);
      } catch (error) {
        console.error('Error loading thumbnail:', error);
        setError(error instanceof Error ? error.message : 'Failed to load document thumbnail');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchThumbnail();
  }, [documentId]);
  
  // Get a friendly file type name
  const getFileTypeName = () => {
    switch (fileType) {
      case 'application/msword':
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return 'Word Document';
      case 'application/vnd.ms-excel':
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        return 'Excel Spreadsheet';
      case 'application/vnd.ms-powerpoint':
      case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
        return 'PowerPoint Presentation';
      default:
        return 'Office Document';
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={32} className="animate-spin text-gray-400" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <FileWarning size={48} className="text-red-500 mb-4" />
        <h3 className="text-xl font-semibold mb-2">Preview Error</h3>
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      {thumbnail ? (
        <img 
          src={thumbnail} 
          alt="Document Thumbnail" 
          className="max-h-96 object-contain mb-4 border shadow-sm"
        />
      ) : (
        <div className="w-64 h-64 bg-gray-100 flex items-center justify-center mb-4 border">
          <span className="text-gray-400">No preview available</span>
        </div>
      )}
      
      <h3 className="text-xl font-semibold mb-2">{getFileTypeName()}</h3>
      <p className="text-gray-600 mb-4">
        Full preview is not available for this document type.
      </p>
      
      <a 
        href={`/api/documents/${documentId}/download`} 
        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors"
        target="_blank"
        rel="noopener noreferrer"
      >
        Download to View
      </a>
    </div>
  );
}