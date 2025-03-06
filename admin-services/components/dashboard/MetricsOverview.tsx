'use client'

import { Activity, Clock, Search, Zap } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: string
  description: string
  icon: React.ElementType
  trend?: {
    value: string
    positive: boolean
  }
}

function MetricCard({ title, value, description, icon: Icon, trend }: MetricCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className="p-3 bg-indigo-100 rounded-full">
          <Icon className="h-6 w-6 text-indigo-600" />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">{description}</p>
        {trend && (
          <div className={`text-sm font-medium ${trend.positive ? 'text-green-600' : 'text-red-600'}`}>
            {trend.positive ? '+' : ''}{trend.value}
          </div>
        )}
      </div>
    </div>
  )
}

export default function MetricsOverview() {
  // In a real application, this data would come from your API
  const metrics = [
    {
      title: 'Total Queries',
      value: '34,218',
      description: 'All-time queries processed',
      icon: Search,
      trend: { value: '12%', positive: true }
    },
    {
      title: 'Avg Response Time',
      value: '1.2s',
      description: 'Average processing time',
      icon: Clock,
      trend: { value: '0.3s', positive: true }
    },
    {
      title: 'Active Instances',
      value: '8',
      description: 'Ollama instances running',
      icon: Zap
    },
    {
      title: 'Requests per Minute',
      value: '42',
      description: 'Current system load',
      icon: Activity,
      trend: { value: '7%', positive: false }
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metrics.map((metric) => (
        <MetricCard key={metric.title} {...metric} />
      ))}
    </div>
  )
}