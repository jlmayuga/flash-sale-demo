import HomePage from './pages/HomePage/HomePage.jsx'
import AdminPage from './pages/AdminPage/AdminPage.jsx'

export default function App() {
  return window.location.pathname.startsWith('/admin') ? (
    <AdminPage />
  ) : (
    <HomePage />
  )
}
