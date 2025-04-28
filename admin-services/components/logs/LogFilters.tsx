'use client';

import { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X, Filter, DownloadCloud } from 'lucide-react';

interface LogFiltersProps {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  selectedModel: string;
  setSelectedModel: (value: string) => void;
  availableModels: string[];
  fromDate: string;
  setFromDate: (value: string) => void;
  toDate: string;
  setToDate: (value: string) => void;
  onSearch: (e: React.FormEvent) => void;
  onClearFilters: () => void;
  onExport?: () => void;
}

export default function LogFilters({
  searchQuery,
  setSearchQuery,
  selectedModel,
  setSelectedModel,
  availableModels,
  fromDate,
  setFromDate,
  toDate,
  setToDate,
  onSearch,
  onClearFilters,
  onExport
}: LogFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Filters</CardTitle>
        <CardDescription>
          Filter logs based on query, model, time range, and more
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSearch} className="space-y-4">
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
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger id="modelFilter">
                  <SelectValue placeholder="All Models" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Models</SelectItem>
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
          
          {/* Advanced filters */}
          {showAdvanced && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4 pt-4 border-t">
              <div className="flex flex-col space-y-1.5">
                <label htmlFor="sessionId" className="text-sm font-medium">Session ID</label>
                <Input id="sessionId" placeholder="Filter by session ID" />
              </div>
              
              <div className="flex flex-col space-y-1.5">
                <label htmlFor="userId" className="text-sm font-medium">User ID</label>
                <Input id="userId" placeholder="Filter by user ID" />
              </div>
              
              <div className="flex flex-col space-y-1.5">
                <label htmlFor="latency" className="text-sm font-medium">Min Latency (ms)</label>
                <Input id="latency" type="number" placeholder="e.g. 1000" />
              </div>
            </div>
          )}
          
          <div className="flex justify-between">
            <div className="space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClearFilters}
              >
                <X className="mr-2 h-4 w-4" />
                Clear Filters
              </Button>
              
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                <Filter className="mr-2 h-4 w-4" />
                {showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
              </Button>
            </div>
            
            <div className="space-x-2">
              {onExport && (
                <Button type="button" variant="outline" onClick={onExport}>
                  <DownloadCloud className="mr-2 h-4 w-4" />
                  Export Logs
                </Button>
              )}
              
              <Button type="submit">
                <Search className="mr-2 h-4 w-4" />
                Search
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}