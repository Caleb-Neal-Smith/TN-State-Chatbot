'use client'

import { useEffect, useState } from 'react';
import { Activity, FileText, MessageSquare, ArrowUpRight } from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { SystemStatus } from '@/components/dashboard/SystemStatus';
import { PerformanceChart } from '@/components/dashboard/PerformanceChart';
import { ModelsList } from '@/components/dashboard/ModelsList';
import { DocumentStats } from '@/components/dashboard/DocumentStats';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    documents: { total: 0, totalSize: 0, types: {} },
    health: {
      orchestration: {
        status: '',
        ollama_api: '',
        opensearch: '',
        cache: '',
        context_builder: '',
        statistics: {}
      },
      ollama: {
        status: '',
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

  // Performance chart data
  const [performanceData, setPerformanceData] = useState({
    latency: Array(7).fill(0).map((_, i) => ({ name: `Day ${i + 1}`, value: 0 })),
    requests: Array(7).fill(0).map((_, i) => ({ name: `Day ${i + 1}`, value: 0 })),
    success: Array(7).fill(0).map((_, i) => ({ name: `Day ${i + 1}`, value: 0 }))
  });

  // Format uptime to human-readable
  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m ${seconds % 60}s`;
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await fetch('/api/dashboard');
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data');
        }
        
        const data = await response.json();
        setDashboardData(data);
        
        // Generate sample performance data for demo
        // In a real implementation, you would fetch historical data from an API
        setPerformanceData({
          latency: Array(7).fill(0).map((_, i) => ({ 
            name: `Day ${i + 1}`, 
            value: Math.round(data.statistics.avg_latency_ms * (0.7 + Math.random() * 0.6))
          })),
          requests: Array(7).fill(0).map((_, i) => ({ 
            name: `Day ${i + 1}`, 
            value: Math.round(data.statistics.total_requests / 7 * (0.5 + Math.random() * 1))
          })),
          success: Array(7).fill(0).map((_, i) => ({ 
            name: `Day ${i + 1}`, 
            value: Math.round(data.statistics.success_rate * 100 * (0.85 + Math.random() * 0.2))
          }))
        });

        setLoading(false);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // Keep loading state if there's an error
        setTimeout(() => {
          setLoading(false);
        }, 2000);
      }
    };

    fetchDashboardData();
    
    // Set up auto-refresh every 30 seconds
    const intervalId = setInterval(fetchDashboardData, 30000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Documents" 
          value={dashboardData.documents.total}
          icon={<FileText className="h-4 w-4" />}
          loading={loading}
        />
        <StatCard 
          title="Total Requests" 
          value={dashboardData.statistics.total_requests}
          icon={<MessageSquare className="h-4 w-4" />}
          loading={loading}
        />
        <StatCard 
          title="Success Rate" 
          value={`${Math.round(dashboardData.statistics.success_rate * 100)}%`}
          icon={<Activity className="h-4 w-4" />}
          loading={loading}
        />
        <StatCard 
          title="System Uptime" 
          value={formatUptime(dashboardData.statistics.uptime_seconds)}
          icon={<ArrowUpRight className="h-4 w-4" />}
          loading={loading}
        />
      </div>

      {/* Middle Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PerformanceChart 
            title="System Performance" 
            description="Key performance metrics over time"
            data={performanceData}
            loading={loading}
          />
        </div>
        <div>
          <SystemStatus health={dashboardData.health} loading={loading} />
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <DocumentStats documents={dashboardData.documents} loading={loading} />
        </div>
        <div>
          <ModelsList models={dashboardData.models} loading={loading} />
        </div>
      </div>
    </div>
  );
}