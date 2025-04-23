import { Bell, User } from 'lucide-react'
import { SidebarTrigger } from '../ui/sidebar'

export default function Navbar() {
  return (
    <header className="bg-white shadow-sm">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex">
            <SidebarTrigger />
          <h1 className="text-xl font-semibold text-gray-800 px-2">RAG Admin Dashboard</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <button className="p-1 rounded-full text-gray-500 hover:bg-gray-100 focus:outline-none">
            <Bell size={20} />
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