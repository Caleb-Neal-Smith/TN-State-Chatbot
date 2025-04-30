'use client';

import { useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface LogsPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

export default function LogsPagination({ 
  currentPage, 
  totalPages, 
  totalItems,
  itemsPerPage
}: LogsPaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  
  // Navigate to a specific page
  const navigateToPage = (page: number) => {
    startTransition(() => {
      // Create a new URLSearchParams instance and copy existing parameters
      const params = new URLSearchParams(searchParams);
      
      // Update the page parameter
      params.set('page', page.toString());
      
      // Build the new URL
      const newUrl = `${pathname}?${params.toString()}`;
      
      // Navigate to the new URL
      router.push(newUrl);
    });
  };
  
  // Handle items per page change
  const handleItemsPerPageChange = (value: string) => {
    startTransition(() => {
      // Create a new URLSearchParams instance and copy existing parameters
      const params = new URLSearchParams(searchParams);
      
      // Update the limit parameter
      params.set('limit', value);
      
      // Reset to page 1 when changing items per page
      params.set('page', '1');
      
      // Build the new URL
      const newUrl = `${pathname}?${params.toString()}`;
      
      // Navigate to the new URL
      router.push(newUrl);
    });
  };
  
  // Calculate page display range
  const getPageRange = () => {
    const range = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        range.push(i);
      }
    } else {
      // Always show first page
      range.push(1);
      
      // Calculate middle pages to show
      let startPage = Math.max(2, currentPage - 1);
      let endPage = Math.min(totalPages - 1, currentPage + 1);
      
      // Adjust if at the beginning
      if (currentPage <= 3) {
        endPage = 4;
      }
      
      // Adjust if at the end
      if (currentPage >= totalPages - 2) {
        startPage = totalPages - 3;
      }
      
      // Add ellipsis if needed
      if (startPage > 2) {
        range.push(-1); // -1 represents ellipsis
      }
      
      // Add middle pages
      for (let i = startPage; i <= endPage; i++) {
        range.push(i);
      }
      
      // Add ellipsis if needed
      if (endPage < totalPages - 1) {
        range.push(-2); // -2 represents ellipsis (using different key)
      }
      
      // Always show last page
      range.push(totalPages);
    }
    
    return range;
  };
  
  // Get start and end item numbers
  const startItem = Math.min((currentPage - 1) * itemsPerPage + 1, totalItems);
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);
  
  return (
    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6">
      <div className="text-sm text-muted-foreground">
        Showing {startItem} to {endItem} of {totalItems} logs
      </div>
      
      <div className="flex items-center gap-2">
        {/* Items per page selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page:</span>
          <Select
            value={itemsPerPage.toString()}
            onValueChange={handleItemsPerPageChange}
            disabled={isPending}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={itemsPerPage} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Pagination controls */}
        <div className="flex items-center gap-1">
          {/* First page */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => navigateToPage(1)}
            disabled={currentPage === 1 || isPending}
          >
            <ChevronsLeft size={16} />
          </Button>
          
          {/* Previous page */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => navigateToPage(currentPage - 1)}
            disabled={currentPage === 1 || isPending}
          >
            <ChevronLeft size={16} />
          </Button>
          
          {/* Page numbers */}
          {getPageRange().map((page) => (
            page < 0 ? (
              // Ellipsis
              <span key={`ellipsis-${page}`} className="px-2">
                ...
              </span>
            ) : (
              <Button
                key={`page-${page}`}
                variant={page === currentPage ? "default" : "outline"}
                size="icon"
                className="h-8 w-8"
                onClick={() => navigateToPage(page)}
                disabled={isPending}
              >
                {page}
              </Button>
            )
          ))}
          
          {/* Next page */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => navigateToPage(currentPage + 1)}
            disabled={currentPage === totalPages || totalPages === 0 || isPending}
          >
            <ChevronRight size={16} />
          </Button>
          
          {/* Last page */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => navigateToPage(totalPages)}
            disabled={currentPage === totalPages || totalPages === 0 || isPending}
          >
            <ChevronsRight size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}