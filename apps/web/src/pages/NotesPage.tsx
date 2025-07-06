import { useParams } from 'react-router-dom';

export function NotesPage() {
  const { id } = useParams();
  
  return (
    <div className="h-full flex">
      {/* Notes list */}
      <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Your Notes</h3>
          <div className="space-y-2">
            {/* Placeholder note items */}
            <div className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
              <h4 className="font-medium text-gray-900">Sample Note 1</h4>
              <p className="text-sm text-gray-600 mt-1">This is a sample note...</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
              <h4 className="font-medium text-gray-900">Sample Note 2</h4>
              <p className="text-sm text-gray-600 mt-1">Another sample note...</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Note editor */}
      <div className="flex-1 bg-white">
        <div className="h-full p-6">
          {id ? (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Note {id}
              </h2>
              <div className="prose max-w-none">
                <p className="text-gray-600">
                  This is where the BlockNote editor will be integrated.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Select a note to edit
                </h2>
                <p className="text-gray-600">
                  Choose a note from the sidebar or create a new one.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}