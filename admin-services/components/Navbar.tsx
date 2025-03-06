'use client'

import { Bell, User, Settings } from 'lucide-react'
import { SidebarTrigger } from './ui/sidebar'
import PageTitle from './PageTitle'

export default function Navbar() {
  return (
    <header className="bg-white shadow-sm">
      <div className="px-4 py-3 flex items-center justify-between">
        <div>
          <SidebarTrigger className="-ml-1" />
          <PageTitle />
        </div>
        
        <div className="flex items-center space-x-4">
          <button className="p-1 rounded-full text-gray-500 hover:bg-gray-100 focus:outline-none">
            <Bell size={20} />
          </button>
          
          <button className="p-1 rounded-full text-gray-500 hover:bg-gray-100 focus:outline-none">
            <Settings size={20} />
          </button>
          
          <div className="relative">
            <button className="flex items-center focus:outline-none">
              <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-700">
                <User size={20} />
              </div>
              <span className="ml-2 text-sm font-medium text-gray-700">Admin</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}