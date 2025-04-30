'use client';

import { useState, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, Calendar as CalendarIcon, SlidersHorizontal, X } from 'lucide-react';
import { format } from 'date-fns';

interface LogsFilterProps {
  models: string[];
  initialValues?: {
    searchQuery?: string;
    startDate?: Date;
    endDate?: Date;
    model?: string;
    userId?: string;
    sessionId?: string;
  };
}

export default function LogsFilter({ models, initialValues = {} }: LogsFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  
  // Search form state
  const [searchQuery, setSearchQuery] = useState(initialValues.searchQuery || '');
  const [startDate, setStartDate] = useState<Date | undefined>(initialValues.startDate);
  const [endDate, setEndDate] = useState<Date | undefined>(initialValues.endDate);
  const [model, setModel] = useState(initialValues.model || 'all');
  const [userId, setUserId] = useState(initialValues.userId || '');
  const [sessionId, setSessionId] = useState(initialValues.sessionId || '');
  
  // Filter panel state
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);
  
  // Handle search form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };
  
  // Apply filters to URL parameters
  const applyFilters = () => {
    startTransition(() => {
      // Create a new URLSearchParams instance
      const params = new URLSearchParams();
      
      // Add search parameters
      if (searchQuery) params.set('searchQuery', searchQuery);
      if (startDate) params.set('startDate', startDate.toISOString());
      if (endDate) params.set('endDate', endDate.toISOString());
      if (model && model !== 'all') params.set('model', model);
      if (userId) params.set('user_id', userId);
      if (sessionId) params.set('session_id', sessionId);
      
      // Always reset to page 1 when applying filters
      params.set('page', '1');
      
      // Build the new URL
      const newUrl = `${pathname}?${params.toString()}`;
      
      // Navigate to the new URL
      router.push(newUrl);
    });
  };
  
  // Reset all filters
  const resetFilters = () => {
    setSearchQuery('');
    setStartDate(undefined);
    setEndDate(undefined);
    setModel('');
    setUserId('');
    setSessionId('');
    
    // Reset URL parameters
    router.push(pathname);
  };
  
  // Check if any filters are applied
  const hasActiveFilters = searchQuery || startDate || endDate || model || userId || sessionId;
  
  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
          <Input
            type="text"
            placeholder="Search in queries and responses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            disabled={isPending}
          />
        </div>
        
        <Popover open={isAdvancedFilterOpen} onOpenChange={setIsAdvancedFilterOpen}>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              className="flex items-center gap-2" 
              type="button"
              disabled={isPending}
            >
              <SlidersHorizontal size={16} />
              Filters
              {hasActiveFilters && <span className="flex h-2 w-2 rounded-full bg-blue-600" />}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4" align="end">
            <div className="space-y-4">
              <h4 className="font-medium">Advanced Filters</h4>
              
              <div className="space-y-2">
                <Label htmlFor="date-range">Date Range</Label>
                <div className="flex flex-col gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="start-date"
                        variant="outline"
                        className="justify-start text-left"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, 'PP') : 'Start date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="end-date"
                        variant="outline"
                        className="justify-start text-left"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, 'PP') : 'End date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                        disabled={(date) => startDate ? date < startDate : false}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Models</SelectItem>
                    {models.map((modelOption) => (
                      <SelectItem key={modelOption} value={modelOption}>
                        {modelOption}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="user-id">User ID</Label>
                <Input
                  id="user-id"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="Filter by user ID"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="session-id">Session ID</Label>
                <Input
                  id="session-id"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  placeholder="Filter by session ID"
                />
              </div>
              
              <div className="flex justify-between pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={resetFilters}
                  className="flex items-center gap-1"
                  disabled={!hasActiveFilters || isPending}
                >
                  <X size={14} />
                  Reset
                </Button>
                <Button 
                  type="button" 
                  onClick={() => {
                    applyFilters();
                    setIsAdvancedFilterOpen(false);
                  }}
                  disabled={isPending}
                >
                  Apply Filters
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Searching...' : 'Search'}
        </Button>
      </form>
      
      {/* Active filters display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="text-gray-500">Active filters:</span>
          
          {searchQuery && (
            <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full flex items-center gap-1">
              Search: {searchQuery}
              <button 
                onClick={() => {
                  setSearchQuery('');
                  applyFilters();
                }}
                className="text-blue-600 hover:text-blue-800"
              >
                <X size={14} />
              </button>
            </div>
          )}
          
          {startDate && (
            <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full flex items-center gap-1">
              From: {format(startDate, 'PP')}
              <button 
                onClick={() => {
                  setStartDate(undefined);
                  applyFilters();
                }}
                className="text-blue-600 hover:text-blue-800"
              >
                <X size={14} />
              </button>
            </div>
          )}
          
          {endDate && (
            <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full flex items-center gap-1">
              To: {format(endDate, 'PP')}
              <button 
                onClick={() => {
                  setEndDate(undefined);
                  applyFilters();
                }}
                className="text-blue-600 hover:text-blue-800"
              >
                <X size={14} />
              </button>
            </div>
          )}
          
          {model && (
            <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full flex items-center gap-1">
              Model: {model}
              <button 
                onClick={() => {
                  setModel('');
                  applyFilters();
                }}
                className="text-blue-600 hover:text-blue-800"
              >
                <X size={14} />
              </button>
            </div>
          )}
          
          {userId && (
            <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full flex items-center gap-1">
              User: {userId}
              <button 
                onClick={() => {
                  setUserId('');
                  applyFilters();
                }}
                className="text-blue-600 hover:text-blue-800"
              >
                <X size={14} />
              </button>
            </div>
          )}
          
          {sessionId && (
            <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full flex items-center gap-1">
              Session: {sessionId}
              <button 
                onClick={() => {
                  setSessionId('');
                  applyFilters();
                }}
                className="text-blue-600 hover:text-blue-800"
              >
                <X size={14} />
              </button>
            </div>
          )}
          
          <button
            onClick={resetFilters}
            className="text-blue-600 hover:text-blue-800 text-sm underline"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}