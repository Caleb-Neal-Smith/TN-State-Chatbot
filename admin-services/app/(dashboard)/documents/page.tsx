import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Plus, FileText } from 'lucide-react';

import { formatFileSize, formatDate } from '@/lib/utils/fileUtils';
import DocumentSearch from '@/components/documents/DocumentSearch';
import DocumentActions from '@/components/documents/DocumentActions';
import DocumentPagination from '@/components/documents/DocumentPagination';
import { documentService } from '@/services/documentService';

export default async function DocumentsPage(
  props: { 
    searchParams: Promise<{ q?: string; page?: string; limit?: string }> 
  }
) {
  const searchParams = await props.searchParams;
  // Get search parameters from the URL
  const searchQuery = searchParams.q || '';
  const currentPage = parseInt(searchParams.page || '1');
  const itemsPerPage = parseInt(searchParams.limit || '10');

  // Fetch documents server-side
  const { documents, total } = await documentService.getDocuments({
    page: currentPage,
    limit: itemsPerPage,
    searchQuery
  });

  // Calculate pagination
  const totalPages = Math.ceil(total / itemsPerPage);
  const isLoading = false; // No loading state needed for SSR

  return (
    <div className="container mx-auto py-6 space-y-6 p-2">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Documents</h1>
        <Link href="/documents/upload">
          <Button className="flex items-center gap-2">
            <Plus size={16} />
            Upload Document
          </Button>
        </Link>
      </div>
      
      {/* Search and filters (client component) */}
      <DocumentSearch initialQuery={searchQuery} />
      
      {/* Documents table */}
      <Table>
        <TableCaption>
          {isLoading ? 'Loading documents...' : 
            total > 0 ? 
              `Showing ${Math.min((currentPage - 1) * itemsPerPage + 1, total)}-${Math.min(currentPage * itemsPerPage, total)} of ${total} documents` : 
              'No documents found'}
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40%]">Document Name</TableHead>
            <TableHead className="w-[20%]">File Type</TableHead>
            <TableHead className="w-[15%]">Size</TableHead>
            <TableHead className="w-[15%]">Uploaded</TableHead>
            <TableHead className="w-[10%] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8">
                No documents found. <Link href="/documents/upload" className="text-blue-500 hover:underline">Upload your first document</Link>
              </TableCell>
            </TableRow>
          ) : (
            documents.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell className="font-medium">
                  <Link href={`/documents/${doc.id}`} className="hover:underline flex items-center gap-2">
                    <FileText size={16} />
                    {doc.name}
                  </Link>
                  {doc.description && (
                    <p className="text-sm text-gray-500 mt-1 truncate">{doc.description}</p>
                  )}
                </TableCell>
                <TableCell>{doc.fileType}</TableCell>
                <TableCell>{formatFileSize(doc.fileSize)}</TableCell>
                <TableCell>{formatDate(doc.uploadedAt)}</TableCell>
                <TableCell className="text-right">
                  <DocumentActions documentId={doc.id} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      
      {/* Pagination (client component) */}
      {totalPages > 1 && (
        <DocumentPagination 
          currentPage={currentPage} 
          totalPages={totalPages} 
        />
      )}
    </div>
  );
}