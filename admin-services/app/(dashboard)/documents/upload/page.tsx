import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import DocumentUploadForm from '@/components/documents/DocumentUploadForm';

export default function UploadDocumentPage() {
  return (
    <div className="container mx-auto py-6 p-2">
      <div className="mb-6">
        <Link href="/documents">
          <Button variant="ghost" className="flex items-center gap-2">
            <ArrowLeft size={16} />
            Back to Documents
          </Button>
        </Link>
      </div>
      
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Upload Document</CardTitle>
        </CardHeader>
        
        {/* Client component for file upload functionality */}
        <DocumentUploadForm />
      </Card>
    </div>
  );
}