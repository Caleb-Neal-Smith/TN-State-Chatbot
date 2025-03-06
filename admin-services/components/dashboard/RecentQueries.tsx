'use client'

import { format } from 'date-fns'
import { Clock, CheckCircle, XCircle } from 'lucide-react'

// Mock data - in a real app, fetch this from your API
const recentQueries = [
  {
    id: '1',
    query: 'How does the document indexing process work?',
    timestamp: new Date(2025, 2, 3, 10, 15, 0), // March 3, 2025, 10:15 AM
    responseTime: 0.8,
    status: 'success',
    model: 'llama2-7b'
  },
  {
    id: '2',
    query: 'What are the key features of the RAG system?',
    timestamp: new Date(2025, 2, 3, 10, 12, 0),
    responseTime: 1.2,
    status: 'success',
    model: 'llama2-7b'
  },
  {
    id: '3',
    query: 'How can I configure the vector database for optimal performance?',
    timestamp: new Date(2025, 2, 3, 10, 5, 0),
    responseTime: 0.9,
    status: 'success',
    model: 'mistral-7b'
  },
  {
    id: '4',
    query: 'What is the current system health status?',
    timestamp: new Date(2025, 2, 3, 9, 58, 0),
    responseTime: 2.1,
    status: 'error',
    model: 'llama2-7b'
  },
  {
    id: '5',
    query: 'How many documents have been processed in the last 24 hours?',
    timestamp: new Date(2025, 2, 3, 9, 45, 0),
    responseTime: 0.7,
    status: 'success',
    model: 'mistral-7b'
  }
]

export default function RecentQueries() {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b">
        <h3 className="text-lg font-semibold text-gray-800">Recent Queries</h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Query
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Timestamp
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Response Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Model
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {recentQueries.map((query) => (
              <tr key={query.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 truncate max-w-md">
                    {query.query}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="mr-1 h-4 w-4" />
                    {format(query.timestamp, 'HH:mm:ss')}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {query.responseTime}s
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {query.status === 'success' ? (
                    <div className="flex items-center text-green-600">
                      <CheckCircle className="mr-1 h-4 w-4" />
                      <span className="text-sm">Success</span>
                    </div>
                  ) : (
                    <div className="flex items-center text-red-600">
                      <XCircle className="mr-1 h-4 w-4" />
                      <span className="text-sm">Error</span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {query.model}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="px-6 py-4 border-t">
        <button className="text-sm text-indigo-600 hover:text-indigo-900">
          View all queries
        </button>
      </div>
    </div>
  )
}