'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import LogsFilter from '@/components/logs/LogsFilter';
import LogsTable from '@/components/logs/LogsTable';
import LogsPagination from '@/components/logs/LogsPagination';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LogEntry } from '@/app/api/logs/route';

// Search params component wrapped in its own client component
function SearchParamsWrapper({ children }: { children: (params: URLSearchParams) => React.ReactNode }) {
  const searchParams = useSearchParams();
  return <>{children(searchParams)}</>;
}

export default function LogsPage() {
  // State
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [totalLogs, setTotalLogs] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [models, setModels] = useState<string[]>([]);
  const [sortField, setSortField] = useState<string>('@timestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // These values will be set by the SearchParamsWrapper
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [model, setModel] = useState('');
  const [userId, setUserId] = useState('');
  const [sessionId, setSessionId] = useState('');
  
  // Fetch logs from API
  useEffect(() => {
    async function fetchLogs() {
      setIsLoading(true);
      setError(null);
      
      try {
        // Build query string for API request
        const queryParams = new URLSearchParams();
        queryParams.set('page', page.toString());
        queryParams.set('limit', limit.toString());
        queryParams.set('sortField', sortField);
        queryParams.set('sortDirection', sortDirection);
        
        if (searchQuery) queryParams.set('searchQuery', searchQuery);
        if (startDate) queryParams.set('startDate', startDate);
        if (endDate) queryParams.set('endDate', endDate);
        if (model) queryParams.set('model', model);
        if (userId) queryParams.set('user_id', userId);
        if (sessionId) queryParams.set('session_id', sessionId);
        
        // Fetch logs from API
        const response = await fetch(`/api/logs?${queryParams.toString()}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch logs: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Update state with fetched data
        setLogs(data.logs);
        setTotalLogs(data.pagination.total);
        setTotalPages(data.pagination.totalPages);
      } catch (err) {
        console.error('Error fetching logs:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch logs');
        setLogs([]);
        setTotalLogs(0);
        setTotalPages(0);
      } finally {
        setIsLoading(false);
      }
    }
    
    // Only fetch logs when on the custom tab
      fetchLogs();
  }, [
    page,
    limit,
    searchQuery,
    startDate,
    endDate,
    model,
    userId,
    sessionId,
    sortField,
    sortDirection
  ]);
  
  // Fetch available models
  useEffect(() => {
    async function fetchModels() {
      try {
        const response = await fetch('/api/models');
        
        if (response.ok) {
          const data = await response.json();
          setModels(data.models || []);
        }
      } catch (err) {
        console.error('Error fetching models:', err);
      }
    }
    
    fetchModels();
  }, []);
  
  // Handle sorting
  const handleSort = (field: string) => {
    if (field === sortField) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default to descending
      setSortField(field);
      setSortDirection('desc');
    }
  };
  
  return (
    <div className="container mx-auto py-6 space-y-6 p-2 w-full overflow-hidden">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Logs</h1>
      </div>
      
      <Suspense fallback={<div className="p-4 text-center">Loading logs interface...</div>}>
        <SearchParamsWrapper>
          {(params) => {
            // Extract query params from the passed searchParams
            const pageParam = parseInt(params.get('page') || '1');
            const limitParam = parseInt(params.get('limit') || '10');
            const searchQueryParam = params.get('searchQuery') || '';
            const startDateParam = params.get('startDate');
            const endDateParam = params.get('endDate');
            const modelParam = params.get('model') || '';
            const userIdParam = params.get('user_id') || '';
            const sessionIdParam = params.get('session_id') || '';
            
            // Update state with the extracted params
            if (page !== pageParam) setPage(pageParam);
            if (limit !== limitParam) setLimit(limitParam);
            if (searchQuery !== searchQueryParam) setSearchQuery(searchQueryParam);
            if (startDate !== startDateParam) setStartDate(startDateParam);
            if (endDate !== endDateParam) setEndDate(endDateParam);
            if (model !== modelParam) setModel(modelParam);
            if (userId !== userIdParam) setUserId(userIdParam);
            if (sessionId !== sessionIdParam) setSessionId(sessionIdParam);
            
            return (
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Query Logs</CardTitle>
              <CardDescription>
                View and search interaction logs from the RAG system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 overflow-x-auto">
              {/* Filters */}
              <LogsFilter 
                models={models}
                initialValues={{
                  searchQuery,
                  startDate: startDate ? new Date(startDate) : undefined,
                  endDate: endDate ? new Date(endDate) : undefined,
                  model,
                  userId,
                  sessionId
                }}
              />
              
              {/* Error display */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              {/* Logs table */}
              <LogsTable 
                logs={logs}
                isLoading={isLoading}
                onSort={handleSort}
                sortField={sortField}
                sortDirection={sortDirection}
              />
              
              {/* Pagination */}
              {totalLogs > 0 && (
                <LogsPagination 
                  currentPage={page}
                  totalPages={totalPages}
                  totalItems={totalLogs}
                  itemsPerPage={limit}
                />
              )}
            </CardContent>
          </Card>
            );
          }}
        </SearchParamsWrapper>
      </Suspense>
    </div>
  );
}