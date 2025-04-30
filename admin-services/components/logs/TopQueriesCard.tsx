'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';

interface QueryVariant {
  query: string;
  count: number;
}

interface QueryGroup {
  representativeQuery: string;
  variants: string[];
  totalCount: number;
  variantCounts: QueryVariant[];
}

export default function TopQueriesCard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queryGroups, setQueryGroups] = useState<QueryGroup[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  
  useEffect(() => {
    const fetchTopQueries = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/logs/common-queries');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch common queries: ${response.status}`);
        }
        
        const data = await response.json();
        setQueryGroups(data.topQueryGroups || []);
      } catch (err) {
        console.error('Error fetching top queries:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch top queries');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTopQueries();
  }, []);
  
  const toggleExpand = (query: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [query]: !prev[query]
    }));
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp size={18} />
          Top User Queries
        </CardTitle>
        <CardDescription>Most common questions, grouped by semantic similarity</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 size={24} className="animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-sm text-red-500 py-2">{error}</div>
        ) : queryGroups.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center">
            No queries found
          </div>
        ) : (
          <div className="space-y-4">
            {queryGroups.map((group, index) => (
              <div key={index} className="pb-3 border-b last:border-0 last:pb-0">
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-3">
                    <span className="flex items-center justify-center bg-muted w-8 h-8 rounded-full text-lg font-semibold">
                      {index + 1}
                    </span>
                    <div>
                      <div className="font-medium">{group.representativeQuery}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        <Badge variant="outline" className="mr-2">
                          {group.totalCount} {group.totalCount === 1 ? 'time' : 'times'}
                        </Badge>
                        {group.variants.length > 1 && (
                          <Badge variant="secondary">
                            {group.variants.length} variants
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {group.variants.length > 1 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => toggleExpand(group.representativeQuery)}
                      className="h-8 px-2"
                    >
                      {expandedGroups[group.representativeQuery] ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                    </Button>
                  )}
                </div>
                
                {expandedGroups[group.representativeQuery] && group.variants.length > 1 && (
                  <div className="mt-3 ml-11 pl-3 border-l text-sm space-y-2">
                    {group.variantCounts
                      .sort((a, b) => b.count - a.count)
                      .map((variant, i) => (
                        <div key={i} className="flex justify-between">
                          <span className="text-muted-foreground mr-2">{encodeURIComponent(variant.query)}</span>
                          <Badge variant="outline" className="ml-auto">
                            {variant.count} {variant.count === 1 ? 'time' : 'times'}
                          </Badge>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}