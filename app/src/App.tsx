import { Routes, Route } from 'react-router'
import Layout from './components/Layout'
import Home from './pages/Home'
import Login from "./pages/Login"
import NotFound from "./pages/NotFound"
import PrayerTimes from './pages/PrayerTimes'
import Tracker from './pages/Tracker'
import Quran from './pages/Quran'
import QuranReader from './pages/QuranReader'
import Azkar from './pages/Azkar'
import Mosques from './pages/Mosques'
import Library from './pages/Library'
import Charity from './pages/Charity'
import Ramadan from './pages/Ramadan'
import Profile from './pages/Profile'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/prayer-times" element={<PrayerTimes />} />
        <Route path="/tracker" element={<Tracker />} />
        <Route path="/quran" element={<Quran />} />
        <Route path="/quran/:surah" element={<QuranReader />} />
        <Route path="/azkar" element={<Azkar />} />
        <Route path="/mosques" element={<Mosques />} />
        <Route path="/library" element={<Library />} />
        <Route path="/charity" element={<Charity />} />
        <Route path="/ramadan" element={<Ramadan />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
