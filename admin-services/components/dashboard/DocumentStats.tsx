import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface DocumentStatsProps {
  documents: {
    total: number;
    totalSize: number;
    types: Record<string, number>;
  };
  loading?: boolean;
}

export function DocumentStats({ documents, loading = false }: DocumentStatsProps) {
  // Format file size to human-readable format
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  // Convert document types to array and sort by count
  const documentTypes = Object.entries(documents?.types || {}).map(([type, count]) => ({
    type: type === 'application/pdf' ? 'PDF' : 
          type === 'text/plain' ? 'Text' : 
          type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ? 'Word' : 
          type.split('/').pop() || type,
    count,
    percentage: documents.total ? Math.round((count / documents.total) * 100) : 0
  })).sort((a, b) => b.count - a.count);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Document Statistics</CardTitle>
          <CardDescription>Overview of documents in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between">
              <div className="h-5 w-24 animate-pulse rounded-md bg-muted"></div>
              <div className="h-5 w-16 animate-pulse rounded-md bg-muted"></div>
            </div>
            <div className="h-4 w-full animate-pulse rounded-full bg-muted"></div>
            
            <div className="flex justify-between">
              <div className="h-5 w-24 animate-pulse rounded-md bg-muted"></div>
              <div className="h-5 w-16 animate-pulse rounded-md bg-muted"></div>
            </div>
            <div className="h-4 w-full animate-pulse rounded-full bg-muted"></div>
            
            <div className="flex justify-between">
              <div className="h-5 w-24 animate-pulse rounded-md bg-muted"></div>
              <div className="h-5 w-16 animate-pulse rounded-md bg-muted"></div>
            </div>
            <div className="h-4 w-full animate-pulse rounded-full bg-muted"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Document Statistics</CardTitle>
        <CardDescription>Overview of documents in the system</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-sm font-medium">Total Documents</div>
            <div className="text-2xl font-bold">{documents.total}</div>
          </div>
          <div>
            <div className="text-sm font-medium">Total Size</div>
            <div className="text-2xl font-bold">{formatFileSize(documents.totalSize)}</div>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="text-sm font-medium">Document Types</div>
          
          {documentTypes.length === 0 ? (
            <div className="text-sm text-muted-foreground">No documents available</div>
          ) : (
            documentTypes.slice(0, 5).map((docType, index) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{docType.type}</span>
                  <span>{docType.count} ({docType.percentage}%)</span>
                </div>
                <Progress value={docType.percentage} className="h-2" />
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
