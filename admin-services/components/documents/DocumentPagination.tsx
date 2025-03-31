'use client';

import { useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DocumentPaginationProps {
  currentPage: number;
  totalPages: number;
}

export default function DocumentPagination({ 
  currentPage, 
  totalPages 
}: DocumentPaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  
  // Navigate to a specific page
  const navigateToPage = (page: number) => {
    startTransition(() => {
      // Create a new URLSearchParams instance and add existing parameters
      const params = new URLSearchParams(searchParams);
      
      // Update or add the page parameter
      if (page > 1) {
        params.set('page', page.toString());
      } else {
        params.delete('page'); // Remove page parameter for page 1
      }
      
      // Build the new URL
      const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      
      // Navigate to the new URL
      router.push(newUrl);
    });
  };
  
  return (
    <div className="flex justify-center mt-6">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigateToPage(currentPage - 1)}
          disabled={currentPage === 1 || isPending}
        >
          <ChevronLeft size={16} />
        </Button>
        
        <span className="text-sm mx-2">
          Page {currentPage} of {totalPages}
        </span>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigateToPage(currentPage + 1)}
          disabled={currentPage === totalPages || isPending}
        >
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
}