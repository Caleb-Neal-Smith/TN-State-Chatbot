'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function ResourceUsage() {
  // Mock data - in a real app, fetch this from your API
  const data = [
    { time: '00:00', cpu: 20, memory: 35, gpu: 15 },
    { time: '03:00', cpu: 15, memory: 30, gpu: 10 },
    { time: '06:00', cpu: 10, memory: 28, gpu: 5 },
    { time: '09:00', cpu: 45, memory: 40, gpu: 30 },
    { time: '12:00', cpu: 80, memory: 65, gpu: 70 },
    { time: '15:00', cpu: 75, memory: 60, gpu: 65 },
    { time: '18:00', cpu: 60, memory: 55, gpu: 50 },
    { time: '21:00', cpu: 40, memory: 45, gpu: 30 }
  ]

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Resource Utilization</h3>
        <select className="text-sm border-gray-300 rounded">
          <option value="cluster">Entire Cluster</option>
          <option value="node1">Node 1</option>
          <option value="node2">Node 2</option>
          <option value="node3">Node 3</option>
        </select>
      </div>
      
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{
              top: 5,
              right: 5,
              left: 5,
              bottom: 20,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis unit="%" />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="cpu" stroke="#3b82f6" name="CPU Usage" />
            <Line type="monotone" dataKey="memory" stroke="#10b981" name="Memory Usage" />
            <Line type="monotone" dataKey="gpu" stroke="#f59e0b" name="GPU Usage" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}