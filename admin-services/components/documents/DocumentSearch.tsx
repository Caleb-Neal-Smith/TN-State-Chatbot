'use client';

import { useState, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, SlidersHorizontal } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

interface DocumentSearchProps {
  initialQuery?: string;
}

export default function DocumentSearch({ initialQuery = '' }: DocumentSearchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [isPending, startTransition] = useTransition();
  
  // Handle search submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Update URL with search params
    startTransition(() => {
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      
      const newUrl = params.toString() ? `?${params.toString()}` : '';
      router.push(`${pathname}${newUrl}`);
    });
  };
  
  // Handle file type filter selection
  const handleFileTypeFilter = (fileType: string) => {
    startTransition(() => {
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      params.set('fileType', fileType);
      
      const newUrl = params.toString() ? `?${params.toString()}` : '';
      router.push(`${pathname}${newUrl}`);
    });
  };
  
  // Handle date filter selection
  const handleDateFilter = (days: number) => {
    startTransition(() => {
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      params.set('days', days.toString());
      
      const newUrl = params.toString() ? `?${params.toString()}` : '';
      router.push(`${pathname}${newUrl}`);
    });
  };
  
  return (
    <div className="flex gap-2">
      <form onSubmit={handleSearch} className="flex-1 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
          <Input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            disabled={isPending}
          />
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Searching...' : 'Search'}
        </Button>
      </form>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2" disabled={isPending}>
            <SlidersHorizontal size={16} />
            Filter
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>File Types</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => handleFileTypeFilter('pdf')}>PDF</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => handleFileTypeFilter('word')}>Word</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => handleFileTypeFilter('text')}>Text</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Date Uploaded</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => handleDateFilter(7)}>Last 7 days</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => handleDateFilter(30)}>Last 30 days</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => handleDateFilter(90)}>Last 90 days</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}