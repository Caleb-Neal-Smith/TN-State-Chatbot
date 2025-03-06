'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function QueryStats() {
  // Mock data - in a real app, fetch this from your API
  const data = [
    { name: '00:00', queries: 12 },
    { name: '03:00', queries: 8 },
    { name: '06:00', queries: 5 },
    { name: '09:00', queries: 18 },
    { name: '12:00', queries: 42 },
    { name: '15:00', queries: 35 },
    { name: '18:00', queries: 27 },
    { name: '21:00', queries: 20 }
  ]

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Query Volume (24h)</h3>
        <select className="text-sm border-gray-300 rounded">
          <option value="24h">Last 24 hours</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
        </select>
      </div>
      
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{
              top: 5,
              right: 5,
              left: 5,
              bottom: 20,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="queries" fill="#4f46e5" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}