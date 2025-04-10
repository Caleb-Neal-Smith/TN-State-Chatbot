import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CircleCheck, CircleDashed, CircleX, Server, Database, Clock, Cpu } from "lucide-react";

interface SystemStatusProps {
  health: {
    orchestration: {
      status: string;
      ollama_api: string;
      opensearch: string;
      cache: string;
      context_builder: string;
    };
    ollama: {
      status: string;
      total_instances: number;
      healthy_instances: number;
      instances: {
        url: string;
        healthy: boolean;
        active_connections: number;
        total_requests: number;
      }[];
    };
  };
  loading?: boolean;
}

function StatusBadge({ status }: { status: string }) {
  if (["healthy", "green"].includes(status.toLowerCase())) {
    return (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
        <CircleCheck className="h-3.5 w-3.5 mr-1" />
        Healthy
      </Badge>
    );
  }
  
  if (["unhealthy", "red"].includes(status.toLowerCase())) {
    return (
      <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
        <CircleX className="h-3.5 w-3.5 mr-1" />
        Unhealthy
      </Badge>
    );
  }
  
  if (["yellow"].includes(status.toLowerCase())) {
    return (
      <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
        <CircleDashed className="h-3.5 w-3.5 mr-1" />
        Degraded
      </Badge>
    );
  }
  
  if (status.toLowerCase() === "not_configured") {
    return (
      <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">
        <CircleDashed className="h-3.5 w-3.5 mr-1" />
        Not Configured
      </Badge>
    );
  }

  return (
    <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">
      <CircleDashed className="h-3.5 w-3.5 mr-1" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export function SystemStatus({ health, loading = false }: SystemStatusProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
          <CardDescription>Current status of all system components</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array(5).fill(0).map((_, index) => (
              <div key={index} className="flex justify-between items-center">
                <div className="h-5 w-24 animate-pulse rounded-md bg-muted"></div>
                <div className="h-5 w-20 animate-pulse rounded-md bg-muted"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Status</CardTitle>
        <CardDescription>Current status of all system components</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Server className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-sm font-medium">Orchestration Service</span>
            </div>
            <StatusBadge status={health.orchestration.status} />
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Cpu className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-sm font-medium">Ollama API</span>
            </div>
            <StatusBadge status={health.orchestration.ollama_api} />
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Database className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-sm font-medium">OpenSearch</span>
            </div>
            <StatusBadge status={health.orchestration.opensearch} />
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-sm font-medium">Cache</span>
            </div>
            <StatusBadge status={health.orchestration.cache} />
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-2 text-muted-foreground">
                <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
                <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
              </svg>
              <span className="text-sm font-medium">Context Builder</span>
            </div>
            <StatusBadge status={health.orchestration.context_builder} />
          </div>
          
          {health.ollama.instances && health.ollama.instances.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-semibold mb-2">Ollama Instances</h4>
              <div className="space-y-2">
                {health.ollama.instances.map((instance, i) => (
                  <div key={i} className="flex justify-between items-center text-xs p-2 bg-muted/50 rounded-md">
                    <div>
                      <span className="font-medium">{instance.url.replace(/https?:\/\//, '')}</span>
                      <div className="text-muted-foreground mt-1">
                        {instance.active_connections} active, {instance.total_requests} requests
                      </div>
                    </div>
                    <StatusBadge status={instance.healthy ? "healthy" : "unhealthy"} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
