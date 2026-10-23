import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { Layout } from '@/components/layout/Layout'
import { LoginPage } from '@/pages/Login'
import { HomePage } from '@/pages/Home'
import { AlbumsPage } from '@/pages/Albums'
import { AlbumDetailPage } from '@/pages/AlbumDetail'
import { ArtistsPage } from '@/pages/Artists'
import { ArtistDetailPage } from '@/pages/ArtistDetail'
import { PlaylistsPage } from '@/pages/Playlists'
import { PlaylistDetailPage } from '@/pages/PlaylistDetail'
import { FavoritesPage } from '@/pages/Favorites'
import { SearchPage } from '@/pages/Search'
import { useAuthStore } from '@/store/authStore'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const currentServerId = useAuthStore((s) => s.currentServerId)
  if (!isAuthenticated || !currentServerId) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route path="/" element={<HomePage />} />
          <Route path="/albums" element={<AlbumsPage />} />
          <Route path="/albums/:id" element={<AlbumDetailPage />} />
          <Route path="/artists" element={<ArtistsPage />} />
          <Route path="/artists/:id" element={<ArtistDetailPage />} />
          <Route path="/playlists" element={<PlaylistsPage />} />
          <Route path="/playlists/:id" element={<PlaylistDetailPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/search" element={<SearchPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#18181b',
            border: '1px solid #3f3f46',
            color: '#f4f4f5',
          },
        }}
      />
    </HashRouter>
  )
}
