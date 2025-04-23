import { NextResponse } from 'next/server';
import { db } from '@/services/dbService';
import { orchestrationService } from '@/services/orchestration';

// Define types to match the orchestration service
interface HealthStatus {
  status: string;
  ollama_api: string;
  opensearch: string;
  cache: string;
  context_builder: string;
  statistics: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
}

interface OllamaInstance {
  url: string;
  healthy: boolean;
  active_connections: number;
  total_requests: number;
  models: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
}

interface OllamaHealth {
  status: string;
  total_instances: number;
  healthy_instances: number;
  instances: OllamaInstance[];
}

export async function GET() {
  try {
    // Default values for the dashboard
    let documentData = {
      total: 0,
      totalSize: 0,
      types: {}
    };
    
    let healthStatus: { orchestration: HealthStatus; ollama: OllamaHealth } = {
      orchestration: {
        status: 'unknown',
        ollama_api: 'unknown',
        opensearch: 'unknown',
        cache: 'unknown',
        context_builder: 'unknown',
        statistics: {}
      },
      ollama: {
        status: 'unknown',
        total_instances: 0,
        healthy_instances: 0,
        instances: []
      }
    };
    
    let statistics = {
      uptime_seconds: 0,
      total_requests: 0,
      successful_requests: 0,
      failed_requests: 0,
      success_rate: 0,
      avg_latency_ms: 0,
      requests_per_second: 0
    };
    
    let models: string[] = [];

    // Get document stats from database
    try {
      const documents = await db.document.findMany();
      documentData = {
        total: documents.length,
        totalSize: documents.reduce((sum, doc) => sum + (doc.fileSize || 0), 0),
        types: documents.reduce((types, doc) => {
          const type = doc.fileType || 'unknown';
          types[type] = (types[type] || 0) + 1;
          return types;
        }, {} as Record<string, number>)
      };
      console.log("Successfully loaded document data");
    } catch (dbError) {
      console.error("Error fetching document data:", dbError);
    }

    // Get health status from orchestration service
    try {
      healthStatus = await orchestrationService.getHealthStatus();
      console.log("Successfully loaded health status");
    } catch (healthError) {
      console.error("Error fetching health status:", healthError);
    }
    
    // Get interaction statistics from orchestration service
    try {
      statistics = await orchestrationService.getStatistics();
      console.log("Successfully loaded statistics");
    } catch (statsError) {
      console.error("Error fetching statistics:", statsError);
    }

    // Get available models
    try {
      const modelData = await orchestrationService.getModels();
      models = modelData.models || [];
      console.log("Successfully loaded models");
    } catch (modelsError) {
      console.error("Error fetching models:", modelsError);
    }

    return NextResponse.json({
      documents: documentData,
      health: healthStatus,
      statistics,
      models
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    // Return minimal data structure with default values
    return NextResponse.json({
      documents: { total: 0, totalSize: 0, types: {} },
      health: {
        orchestration: {
          status: 'error',
          ollama_api: 'error',
          opensearch: 'error',
          cache: 'error',
          context_builder: 'error',
          statistics: {}
        },
        ollama: {
          status: 'error',
          total_instances: 0,
          healthy_instances: 0,
          instances: []
        }
      },
      statistics: {
        uptime_seconds: 0,
        total_requests: 0,
        successful_requests: 0,
        failed_requests: 0,
        success_rate: 0,
        avg_latency_ms: 0,
        requests_per_second: 0
      },
      models: []
    });
  }
}