"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ChartData {
  name: string;
  value: number;
}

interface PerformanceChartProps {
  title: string;
  description?: string;
  data: {
    latency: ChartData[];
    requests: ChartData[];
    success: ChartData[];
  };
  loading?: boolean;
}

export function PerformanceChart({ title, description, data, loading = false }: PerformanceChartProps) {
  const [, setActiveTab] = useState("latency");


  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="latency" className="w-full" onValueChange={(value) => setActiveTab(value)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="latency">Latency</TabsTrigger>
            <TabsTrigger value="requests">Requests</TabsTrigger>
            <TabsTrigger value="success">Success Rate</TabsTrigger>
          </TabsList>
          <div className="h-[300px] mt-4">
            <TabsContent value="latency" className="h-full">
              {loading ? (
                <div className="w-full h-full flex items-center justify-center bg-muted/20 rounded-md animate-pulse" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.latency} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} width={40} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
                      labelStyle={{ fontWeight: 'bold' }}
                    />
                    <Line type="monotone" dataKey="value" name="Avg Latency (ms)" stroke="#ff0000" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </TabsContent>
            <TabsContent value="requests" className="h-full">
              {loading ? (
                <div className="w-full h-full flex items-center justify-center bg-muted/20 rounded-md animate-pulse" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.requests} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={1} />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} width={40} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
                      labelStyle={{ fontWeight: 'bold' }}
                    />
                    <Bar dataKey="value" name="Total Requests" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </TabsContent>
            <TabsContent value="success" className="h-full">
              {loading ? (
                <div className="w-full h-full flex items-center justify-center bg-muted/20 rounded-md animate-pulse" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.success} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} width={40} domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
                      labelStyle={{ fontWeight: 'bold' }}
                      formatter={(value) => [`${value}%`, 'Success Rate']}
                    />
                    <Line type="monotone" dataKey="value" name="Success Rate (%)" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}
