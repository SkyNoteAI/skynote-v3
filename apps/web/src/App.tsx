import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          SkyNote AI
        </h1>
        <div className="card p-8 bg-white rounded-lg shadow-lg">
          <button 
            onClick={() => setCount((count) => count + 1)}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            count is {count}
          </button>
          <p className="mt-4 text-gray-600">
            AI-powered notes application
          </p>
        </div>
      </div>
    </div>
  )
}

export default App