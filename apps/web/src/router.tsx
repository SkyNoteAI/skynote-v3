import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Layout } from './components/Layout';
import { NotesPage } from './pages/NotesPage';
import { LoginPage } from './pages/LoginPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
    errorElement: <ErrorBoundary><div>Error loading login page</div></ErrorBoundary>
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    errorElement: <ErrorBoundary><div>Application error</div></ErrorBoundary>,
    children: [
      {
        index: true,
        element: <NotesPage />
      },
      {
        path: 'notes',
        element: <NotesPage />
      },
      {
        path: 'notes/:id',
        element: <NotesPage />
      },
      {
        path: 'settings',
        element: <SettingsPage />
      }
    ]
  }
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}