import { BrowserRouter, Routes, Route } from 'react-router-dom'
import BookingPage from './pages/BookingPage'
import AdminPage from './pages/AdminPage'
import ExtendResultPage from './pages/ExtendResultPage'
import TermsPage from './pages/TermsPage'
import WelcomePage from './pages/WelcomePage'
import { FACILITIES } from './lib/utils'
import { FACILITIES_EN } from './lib/i18n'

const DROPIN_FACILITIES = FACILITIES.filter((f) => f.id.startsWith('phonebox'))

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<BookingPage />} />
        <Route path="/welcome" element={<WelcomePage />} />
        <Route path="/drop-in" element={<BookingPage facilities={DROPIN_FACILITIES} mode="dropin" />} />
        {/* 英語ページ（2026-11-09 デジタルノマド受け入れ用）。フォンボックスのみ・予約データは共通 */}
        <Route path="/en" element={<BookingPage facilities={FACILITIES_EN} mode="nomad" lang="en" />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/extend-result" element={<ExtendResultPage />} />
        <Route path="/terms" element={<TermsPage />} />
      </Routes>
    </BrowserRouter>
  )
}
