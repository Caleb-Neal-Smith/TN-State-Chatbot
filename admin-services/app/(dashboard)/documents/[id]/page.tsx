import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, FileText, Info } from 'lucide-react';

import { formatFileSize, getFileTypeFromMime } from '@/lib/utils/fileUtils';
import { documentService } from '@/services/documentService';
import DocumentViewerClient from '@/components/documents/DocumentViewerClient';
import DocumentActions from '@/components/documents/DocumentActionsDetail';

interface DocumentPageProps {
  params: Promise<{
    id: string;
  }>
}

export default async function DocumentPage(props: DocumentPageProps) {
  const params = await props.params;
  const { id } = params;

  // Fetch document data server-side
  const document = await documentService.getDocumentById(id);

  // If document not found, show 404 page
  if (!document) {
    notFound();
  }

  return (
    <div className="container mx-auto py-6 space-y-6 p-2">
      <div className="flex justify-between items-start">
        <Link href="/documents">
          <Button variant="ghost" className="flex items-center gap-2">
            <ArrowLeft size={16} />
            Back to Documents
          </Button>
        </Link>
        
        {/* Client component for delete functionality */}
        <DocumentActions documentId={document.id} />
      </div>
      
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileText size={24} />
          {document.name}
        </h1>
        
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="outline">{getFileTypeFromMime(document.fileType)}</Badge>
          <span className="text-sm text-gray-500">{formatFileSize(document.fileSize)}</span>
          <span className="text-sm text-gray-500">•</span>
          <span className="text-sm text-gray-500">
            Uploaded {new Date(document.uploadedAt).toLocaleString()}
          </span>
        </div>
        
        {document.description && (
          <p className="mt-4 text-gray-700">{document.description}</p>
        )}
      </div>
      
      <Tabs defaultValue="preview" className="mt-6">
        <TabsList>
          <TabsTrigger value="preview">Document Preview</TabsTrigger>
          <TabsTrigger value="info">Document Info</TabsTrigger>
        </TabsList>
        
        <TabsContent value="preview" className="mt-4">
          <div className="bg-white rounded-lg border h-[600px] overflow-hidden">
            {/* Client-side document viewer component */}
            <DocumentViewerClient 
              documentId={document.id} 
              fileType={document.fileType}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="info" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info size={18} />
                Document Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <dt className="font-medium text-gray-500">Name</dt>
                  <dd className="col-span-2">{document.name}</dd>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <dt className="font-medium text-gray-500">File Type</dt>
                  <dd className="col-span-2">{getFileTypeFromMime(document.fileType)} ({document.fileType})</dd>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <dt className="font-medium text-gray-500">File Size</dt>
                  <dd className="col-span-2">{formatFileSize(document.fileSize)}</dd>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <dt className="font-medium text-gray-500">Description</dt>
                  <dd className="col-span-2">{document.description || '—'}</dd>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <dt className="font-medium text-gray-500">Uploaded At</dt>
                  <dd className="col-span-2">{new Date(document.uploadedAt).toLocaleString()}</dd>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <dt className="font-medium text-gray-500">Last Updated</dt>
                  <dd className="col-span-2">{new Date(document.updatedAt).toLocaleString()}</dd>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <dt className="font-medium text-gray-500">File Path</dt>
                  <dd className="col-span-2 break-all text-xs font-mono">{document.filePath}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}