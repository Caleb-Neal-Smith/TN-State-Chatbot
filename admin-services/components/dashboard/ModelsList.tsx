import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ModelsListProps {
  models: string[];
  loading?: boolean;
}

export function ModelsList({ models, loading = false }: ModelsListProps) {
  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Available Models</CardTitle>
          <CardDescription>LLM models currently available in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Array(5).fill(0).map((_, i) => (
              <div key={i} className="h-6 w-24 animate-pulse rounded-full bg-muted"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Available Models</CardTitle>
        <CardDescription>LLM models currently available in the system</CardDescription>
      </CardHeader>
      <CardContent>
        {models.length === 0 ? (
          <div className="text-center text-muted-foreground py-4">
            No models available
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {models.map((model) => (
              <Badge key={model} variant="outline" className="text-xs py-1">
                {model}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
