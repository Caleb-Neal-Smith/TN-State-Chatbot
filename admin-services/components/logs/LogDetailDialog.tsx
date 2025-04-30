'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Timer, Clock, MessageSquare, User, Hash } from 'lucide-react';
import { LogEntry } from '@/app/api/logs/route';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface LogDetailDialogProps {
  log: LogEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function LogDetailDialog({ log, open, onOpenChange }: LogDetailDialogProps) {
  if (!log) return null;
  
  // Format timestamp
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare size={18} />
            Log Details
            <Badge variant="outline" className="ml-2">{log.model}</Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-wrap gap-4 mb-4 text-sm">
          <div className="flex items-center gap-1">
            <Clock size={16} className="text-muted-foreground" />
            {formatTimestamp(log['@timestamp'])}
          </div>
          
          <div className="flex items-center gap-1">
            <Timer size={16} className="text-muted-foreground" />
            {log.latency_ms} ms
          </div>
          
          {log.user_id && (
            <div className="flex items-center gap-1">
              <User size={16} className="text-muted-foreground" />
              {log.user_id}
            </div>
          )}
          
          {log.session_id && (
            <div className="flex items-center gap-1">
              <Hash size={16} className="text-muted-foreground" />
              <span className="font-mono text-xs" title={log.session_id}>
                {log.session_id}
              </span>
            </div>
          )}
        </div>
        
        <Tabs defaultValue="conversation" className="flex-1 overflow-hidden flex flex-col">
          <TabsList>
            <TabsTrigger value="conversation">Conversation</TabsTrigger>
            <TabsTrigger value="raw">Raw Data</TabsTrigger>
          </TabsList>
          
          <TabsContent value="conversation" className="flex-1 overflow-hidden flex flex-col">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-auto flex-1 p-1">
              <div className="bg-muted/30 p-4 rounded-md">
                <h3 className="font-medium mb-2">Query</h3>
                <div className="whitespace-pre-wrap">{log.query}</div>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-md">
                <h3 className="font-medium mb-2">Response</h3>
                <div className="whitespace-pre-wrap">{log.response}</div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="raw" className="flex-1 overflow-auto">
            <pre className="text-xs p-4 bg-muted/30 rounded-md">
              {JSON.stringify(log, null, 2)}
            </pre>
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}