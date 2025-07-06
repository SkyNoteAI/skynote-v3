import { Outlet } from 'react-router-dom';

export function Layout() {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar placeholder */}
      <div className="w-64 bg-white shadow-sm border-r border-gray-200">
        <div className="p-4">
          <h2 className="text-lg font-semibold text-gray-900">SkyNote AI</h2>
        </div>
      </div>
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        {/* Header placeholder */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-semibold text-gray-900">Notes</h1>
              <div className="flex items-center space-x-4">
                <button className="text-gray-500 hover:text-gray-700">
                  Settings
                </button>
              </div>
            </div>
          </div>
        </header>
        
        {/* Main content */}
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}