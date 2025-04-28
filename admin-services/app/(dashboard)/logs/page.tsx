'use client'

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Clock, DownloadCloud, Search, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
  metadata?: Record<string, any>; //eslint-disable-line
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [limit] = useState(20);
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  
  // Selected log for detailed view
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  
  // Available models
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  // Function to format timestamp
  const formatTimestamp = (timestamp: number) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  };

  // Function to format latency
  const formatLatency = (latency: number) => {
    return `${latency.toFixed(2)} ms`;
  };

  // Function to truncate text
  const truncateText = (text: string, maxLength: number = 100) => {
    if (!text) return '—';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Fetch logs from API
  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Construct URL with filters
      let url = `/api/logs?page=${currentPage}&limit=${limit}`;
      
      if (searchQuery) {
        url += `&q=${encodeURIComponent(searchQuery)}`;
      }
      
      if (fromDate) {
        url += `&from=${encodeURIComponent(fromDate)}`;
      }
      
      if (toDate) {
        url += `&to=${encodeURIComponent(toDate)}`;
      }
      
      if (selectedModel) {
        url += `&model=${encodeURIComponent(selectedModel)}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch logs: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      setLogs(data.logs || []);
      setTotalLogs(data.total || 0);
    } catch (err) {
      console.error('Error fetching logs:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      
      // Set empty logs if there's an error
      setLogs([]);
      setTotalLogs(0);
    } finally {
      setLoading(false);
    }
  };

  // Fetch available models
  const fetchModels = async () => {
    try {
      const response = await fetch('/api/models');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.models && Array.isArray(data.models)) {
        setAvailableModels(data.models);
      }
    } catch (err) {
      console.error('Error fetching models:', err);
    }
  };

  // Handle search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page
    fetchLogs();
  };

  // Handle clear filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedModel(null);
    setFromDate('');
    setToDate('');
    setCurrentPage(1);
    
    // Fetch logs without filters
    fetchLogs();
  };

  // Effect to fetch logs when page changes
  useEffect(() => {
    fetchLogs();
  }, [currentPage, limit]);

  // Initial data fetch
  useEffect(() => {
    fetchLogs();
    fetchModels();
  }, []);

  return (
    <div className="container p-4 mx-auto">
      <h1 className="text-3xl font-bold mb-6">Interaction Logs</h1>
      
      <div className="grid gap-6">
        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Filters</CardTitle>
            <CardDescription>
              Filter logs based on query, model, time range, and more
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Search Query */}
                <div className="flex flex-col space-y-1.5">
                  <label htmlFor="searchQuery" className="text-sm font-medium">Search Query</label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="searchQuery"
                      placeholder="Search in queries or responses"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                
                {/* Model Filter */}
                <div className="flex flex-col space-y-1.5">
                  <label htmlFor="modelFilter" className="text-sm font-medium">Model</label>
                  <Select 
                    value={selectedModel || "all"} 
                    onValueChange={(value) => setSelectedModel(value === "all" ? null : value)}
                  >
                    <SelectTrigger id="modelFilter">
                      <SelectValue placeholder="All Models" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Models</SelectItem>
                      {availableModels.map((model) => (
                        <SelectItem key={model} value={model}>{model}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Date Range */}
                <div className="flex flex-col space-y-1.5">
                  <label htmlFor="fromDate" className="text-sm font-medium">From Date</label>
                  <Input
                    id="fromDate"
                    type="datetime-local"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                  />
                </div>
                
                <div className="flex flex-col space-y-1.5">
                  <label htmlFor="toDate" className="text-sm font-medium">To Date</label>
                  <Input
                    id="toDate"
                    type="datetime-local"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={handleClearFilters}>
                  <X className="mr-2 h-4 w-4" />
                  Clear Filters
                </Button>
                
                <div className="space-x-2">
                  <Button type="button" variant="outline">
                    <DownloadCloud className="mr-2 h-4 w-4" />
                    Export Logs
                  </Button>
                  
                  <Button type="submit">
                    <Search className="mr-2 h-4 w-4" />
                    Search
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
        
        {/* Error display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {/* Logs Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Interaction Logs</CardTitle>
            <CardDescription>
              {loading
                ? 'Loading logs...'
                : `Showing ${logs.length} of ${totalLogs} total logs`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Timestamp</TableHead>
                  <TableHead className="w-[40%]">Query</TableHead>
                  <TableHead className="w-[100px]">Model</TableHead>
                  <TableHead className="w-[100px]">Latency</TableHead>
                  <TableHead className="w-[100px]">Session ID</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10">
                      {loading ? (
                        <div className="flex justify-center items-center">
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Loading logs...</span>
                        </div>
                      ) : (
                        'No logs found.'
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.query_id} className="cursor-pointer" onClick={() => setSelectedLog(log)}>
                      <TableCell className="font-mono text-xs">
                        <div className="flex items-center">
                          <Clock className="mr-2 h-3 w-3 text-muted-foreground" />
                          {formatTimestamp(log.timestamp)}
                        </div>
                      </TableCell>
                      <TableCell>{truncateText(log.query, 80)}</TableCell>
                      <TableCell>{log.model || '—'}</TableCell>
                      <TableCell>{formatLatency(log.latency_ms)}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.session_id ? truncateText(log.session_id, 8) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            
            {/* Pagination */}
            {logs.length > 0 && (
              <div className="flex items-center justify-between space-x-2 py-4">
                <div className="flex items-center space-x-2">
                  <p className="text-sm text-muted-foreground">
                    Showing <span className="font-medium">{(currentPage - 1) * limit + 1}</span> to <span className="font-medium">{Math.min(currentPage * limit, totalLogs)}</span> of{" "}
                    <span className="font-medium">{totalLogs}</span> results
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    disabled={currentPage * limit >= totalLogs}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Log Details</h2>
                <Button variant="ghost" size="sm" onClick={() => setSelectedLog(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Timestamp</p>
                    <p>{formatTimestamp(selectedLog.timestamp)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Model</p>
                    <p>{selectedLog.model || '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Latency</p>
                    <p>{formatLatency(selectedLog.latency_ms)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Session ID</p>
                    <p className="font-mono text-xs">{selectedLog.session_id || '—'}</p>
                  </div>
                </div>
                
                <Tabs defaultValue="query">
                  <TabsList>
                    <TabsTrigger value="query">Query</TabsTrigger>
                    <TabsTrigger value="response">Response</TabsTrigger>
                    <TabsTrigger value="metadata">Metadata</TabsTrigger>
                  </TabsList>
                  <TabsContent value="query" className="p-4 border rounded-md mt-2">
                    <pre className="whitespace-pre-wrap">{selectedLog.query}</pre>
                  </TabsContent>
                  <TabsContent value="response" className="p-4 border rounded-md mt-2">
                    <pre className="whitespace-pre-wrap">{selectedLog.response}</pre>
                  </TabsContent>
                  <TabsContent value="metadata" className="p-4 border rounded-md mt-2">
                    <pre className="whitespace-pre-wrap">{JSON.stringify(selectedLog.metadata || {}, null, 2)}</pre>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}