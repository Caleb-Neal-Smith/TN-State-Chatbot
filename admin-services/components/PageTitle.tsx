'use client'

import { usePathname } from 'next/navigation'

const pageTitles: Record<string, string> = {
  '/(dashboard)/overview': 'Dashboard',
  '/test': 'Test Queries',
  '/logs': 'System Logs',
  '/models': 'Models',
  '/resources': 'Resources',
  '/config': 'Configuration',
}

export default function PageTitle() {
  const pathname = usePathname()
  
  // Get the title for the current path, or use a default if not found
  const title = pageTitles[pathname]
  
  return (
    <h1 className="text-xl font-semibold text-gray-800">{pathname}</h1>
  )
}