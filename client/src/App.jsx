import { useState } from 'react';
import './index.css';
import Navbar from './components/Navbar';
import LyricFetcher from './components/LyricFetcher';
import YouTubeFetcher from './components/YouTubeFetcher';

function App() {
  const [currentView, setCurrentView] = useState('lyrics'); // 'lyrics' or 'youtube'

  return (
    <div className="app-container">
      <div className="glass-card full-width">
        <h1 className="title">Hikarigoe</h1>
        <p className="subtitle">Media Tool</p>

        <Navbar currentView={currentView} setView={setCurrentView} />

        {currentView === 'lyrics' ? <LyricFetcher /> : <YouTubeFetcher />}
      </div>
    </div>
  );
}

export default App;
