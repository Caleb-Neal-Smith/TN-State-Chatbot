import { Metadata } from 'next'
import MetricsOverview from '@/components/dashboard/MetricsOverview'
import QueryStats from '@/components/dashboard/QueryStats'
import ResourceUsage from '@/components/dashboard/ResourceUsage'
import RecentQueries from '@/components/dashboard/RecentQueries'

export const metadata: Metadata = {
  title: 'Dashboard | RAG Admin',
  description: 'Main dashboard for RAG administration',
}

export default function DashboardPage() {
  return (
    <div className="space-y-6 mr-4 ml-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">Last updated: Just now</span>
          <button className="px-3 py-1 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700">
            Refresh
          </button>
        </div>
      </div>
      
      {/* Metrics Cards */}
      <MetricsOverview />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Query Statistics */}
        <QueryStats />
        
        {/* Resource Usage */}
        <ResourceUsage />
      </div>
      
      {/* Recent Queries Table */}
      <RecentQueries />
    </div>
  )
}