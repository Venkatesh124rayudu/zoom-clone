import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'
import LandingPage from './pages/LandingPage'
import Authentication from './pages/Authentication'
import Home from './pages/Home'
import History from './pages/History'
import { AuthProvider } from './context/AuthContext';
import VideoMeetComponent from './pages/VideoMeet';


function App() {

  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<Authentication />} />
          <Route path="/home" element={<Home />} />
          <Route path="/history" element={<History />} />
          {/* Any other path is a meeting code, e.g. /abc-defg-hij */}
          <Route path="/:id" element={<VideoMeetComponent />} />
        </Routes>
      </AuthProvider>
    </Router>
  )
}

export default App
