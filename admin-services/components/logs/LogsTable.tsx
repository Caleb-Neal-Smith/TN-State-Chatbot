'use client';

import { useState, Fragment } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { formatDistance } from 'date-fns';
import { ChevronDown, ChevronUp, ExternalLink, ArrowUpDown, MessageSquare, Timer, User, Hash, Eye } from 'lucide-react';
import { LogEntry } from '@/app/api/logs/route';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import LogDetailDialog from './LogDetailDialog';

interface LogsTableProps {
  logs: LogEntry[];
  isLoading: boolean;
  onSort: (field: string) => void;
  sortField: string;
  sortDirection: 'asc' | 'desc';
}

export default function LogsTable({ 
  logs, 
  isLoading, 
  onSort, 
  sortField, 
  sortDirection
}: LogsTableProps) {
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  
  // Toggle expanded state of a log
  const toggleExpand = (logId: string) => {
    setExpandedLogs(prev => ({
      ...prev,
      [logId]: !prev[logId]
    }));
  };
  
  // Open log detail dialog
  const openLogDetail = (log: LogEntry) => {
    setSelectedLog(log);
    setDetailDialogOpen(true);
  };
  
  // Format timestamp
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return {
      full: date.toLocaleString(),
      relative: formatDistance(date, new Date(), { addSuffix: true })
    };
  };
  
  // Handle column sort
  const handleSort = (field: string) => {
    onSort(field);
  };
  
  // Get sort icon
  const getSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ArrowUpDown size={14} />;
    }
    
    return sortDirection === 'asc' 
      ? <ChevronUp size={14} /> 
      : <ChevronDown size={14} />;
  };
  
  // Truncate text to a specific length
  const truncateText = (text: string, maxLength: number = 30) => {
    if (text.length <= maxLength) return text;
    return `${text.substring(0, maxLength)}...`;
  };

  return (
    <div className="space-y-2 w-full overflow-auto">
      {/* Log detail dialog */}
      <LogDetailDialog 
        log={selectedLog}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
      />
      
      <div className="overflow-x-auto">
        <Table className="w-full">
        <TableHeader>
          <TableRow>
            <TableHead
              className="w-[15%] cursor-pointer whitespace-nowrap"
              onClick={() => handleSort('@timestamp')}
            >
              <div className="flex items-center gap-1">
                Time {getSortIcon('@timestamp')}
              </div>
            </TableHead>
            <TableHead
              className="w-[10%] cursor-pointer whitespace-nowrap"
              onClick={() => handleSort('model')}
            >
              <div className="flex items-center gap-1">
                Model {getSortIcon('model')}
              </div>
            </TableHead>
            <TableHead
              className="w-[40%] cursor-pointer"
              onClick={() => handleSort('query')}
            >
              <div className="flex items-center gap-1">
                Query {getSortIcon('query')}
              </div>
            </TableHead>
            <TableHead
              className="w-[15%] cursor-pointer whitespace-nowrap"
              onClick={() => handleSort('latency_ms')}
            >
              <div className="flex items-center gap-1">
                Latency {getSortIcon('latency_ms')}
              </div>
            </TableHead>
            <TableHead className="w-[10%]">Session</TableHead>
            <TableHead className="w-[10%] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            // Loading state
            Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={`loading-${index}`}>
                <TableCell>
                  <div className="h-4 w-24 animate-pulse rounded-md bg-muted"></div>
                </TableCell>
                <TableCell>
                  <div className="h-4 w-16 animate-pulse rounded-md bg-muted"></div>
                </TableCell>
                <TableCell>
                  <div className="h-4 w-full animate-pulse rounded-md bg-muted"></div>
                </TableCell>
                <TableCell>
                  <div className="h-4 w-12 animate-pulse rounded-md bg-muted"></div>
                </TableCell>
                <TableCell>
                  <div className="h-4 w-16 animate-pulse rounded-md bg-muted"></div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="h-8 w-8 ml-auto animate-pulse rounded-md bg-muted"></div>
                </TableCell>
              </TableRow>
            ))
          ) : logs.length === 0 ? (
            // Empty state
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                No logs found. Try adjusting your filters.
              </TableCell>
            </TableRow>
          ) : (
            // Logs display
            logs.map((log) => (
              <Fragment key={log.query_id}>
                <TableRow className={expandedLogs[log.query_id] ? 'border-b-0' : ''}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{formatTimestamp(log['@timestamp']).relative}</span>
                      <span className="text-xs text-muted-foreground">{formatTimestamp(log['@timestamp']).full}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{log.model}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="line-clamp-1" title={log.query}>{truncateText(log.query, 30)}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Timer size={16} className="text-muted-foreground" />
                      <span>{log.latency_ms} ms</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {log.session_id ? (
                      <div className="flex items-center gap-1 truncate">
                        <Hash size={16} className="text-muted-foreground flex-shrink-0" />
                        <span className="truncate text-xs" title={log.session_id}>
                          {truncateText(log.session_id, 10)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openLogDetail(log)}
                        title="View details"
                      >
                        <Eye size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleExpand(log.query_id)}
                        title={expandedLogs[log.query_id] ? 'Collapse' : 'Expand'}
                      >
                        {expandedLogs[log.query_id] ? <ChevronUp size={16} /> : <ExternalLink size={16} />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                
                {/* Expanded log detail */}
                {expandedLogs[log.query_id] && (
                  <TableRow className="bg-muted/30">
                    <TableCell colSpan={6} className="py-2">
                      <Card>
                        <CardContent className="p-4 grid md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-semibold flex items-center gap-2 mb-2">
                                <MessageSquare size={16} />
                                Query
                              </h4>
                              <div className="bg-muted p-3 rounded-md whitespace-pre-wrap">
                                {log.query}
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="font-semibold mb-2">Query ID</h4>
                              <div className="bg-muted p-3 rounded-md font-mono text-xs">
                                {log.query_id}
                              </div>
                            </div>
                            
                            {log.user_id && (
                              <div>
                                <h4 className="font-semibold flex items-center gap-2 mb-2">
                                  <User size={16} />
                                  User ID
                                </h4>
                                <div className="bg-muted p-3 rounded-md font-mono text-xs">
                                  {log.user_id}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-semibold flex items-center gap-2 mb-2">
                                Response
                              </h4>
                              <div className="bg-muted p-3 rounded-md whitespace-pre-wrap max-h-64 overflow-y-auto">
                                {log.response}
                              </div>
                            </div>
                            
                            {log.metadata && Object.keys(log.metadata).length > 0 && (
                              <div>
                                <h4 className="font-semibold mb-2">Metadata</h4>
                                <div className="bg-muted p-3 rounded-md max-h-64 overflow-y-auto">
                                  <pre className="text-xs">
                                    {JSON.stringify(log.metadata, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))
          )}
        </TableBody>
      </Table>
      </div>
    </div>
  );
}