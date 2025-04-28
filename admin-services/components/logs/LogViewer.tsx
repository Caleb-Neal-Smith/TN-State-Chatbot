'use client';

import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { X, Clock, User, Hash, Cpu, BarChart2 } from 'lucide-react';

// Define types for log entries
interface LogEntry {
  query_id: string;
  query: string;
  response: string;
  model: string;
  latency_ms: number;
  timestamp: number;
  user_id?: string;
  session_id?: string;
  metadata?: Record<string, any>; // eslint-disable-line
}

interface LogViewerProps {
  log: LogEntry;
  onClose: () => void;
}

export default function LogViewer({ log, onClose }: LogViewerProps) {
  // Function to format timestamp
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-background rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-auto">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Log Details</CardTitle>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription>
              Query ID: <span className="font-mono">{log.query_id}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Log summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center text-sm font-medium text-muted-foreground">
                    <Clock className="mr-1 h-4 w-4" />
                    Timestamp
                  </div>
                  <div>{formatTimestamp(log.timestamp)}</div>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center text-sm font-medium text-muted-foreground">
                    <Cpu className="mr-1 h-4 w-4" />
                    Model
                  </div>
                  <div>{log.model}</div>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center text-sm font-medium text-muted-foreground">
                    <BarChart2 className="mr-1 h-4 w-4" />
                    Latency
                  </div>
                  <div>{log.latency_ms.toFixed(2)} ms</div>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center text-sm font-medium text-muted-foreground">
                    <Hash className="mr-1 h-4 w-4" />
                    Session
                  </div>
                  <div className="font-mono text-xs truncate">
                    {log.session_id ? log.session_id : '-'}
                  </div>
                </div>
              </div>
              
              {/* User ID if available */}
              {log.user_id && (
                <div className="space-y-1">
                  <div className="flex items-center text-sm font-medium text-muted-foreground">
                    <User className="mr-1 h-4 w-4" />
                    User ID
                  </div>
                  <div className="font-mono text-xs">{log.user_id}</div>
                </div>
              )}
              
              {/* Tabs for query, response, metadata */}
              <Tabs defaultValue="query" className="mt-6">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="query">Query</TabsTrigger>
                  <TabsTrigger value="response">Response</TabsTrigger>
                  <TabsTrigger value="metadata">Metadata</TabsTrigger>
                </TabsList>
                
                <TabsContent value="query" className="mt-2">
                  <div className="rounded-md border p-4 bg-muted/50">
                    <pre className="whitespace-pre-wrap font-mono text-sm">{log.query}</pre>
                  </div>
                </TabsContent>
                
                <TabsContent value="response" className="mt-2">
                  <div className="rounded-md border p-4 bg-muted/50">
                    <pre className="whitespace-pre-wrap font-mono text-sm">{log.response}</pre>
                  </div>
                </TabsContent>
                
                <TabsContent value="metadata" className="mt-2">
                  <div className="rounded-md border p-4 bg-muted/50">
                    <pre className="whitespace-pre-wrap font-mono text-sm">
                      {JSON.stringify(log.metadata || {}, null, 2)}
                    </pre>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}