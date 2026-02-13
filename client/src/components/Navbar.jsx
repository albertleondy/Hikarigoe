import React from 'react';

const Navbar = ({ currentView, setView }) => {
    return (
        <div className="navbar">
            <button
                className={`nav-button ${currentView === 'lyrics' ? 'active' : ''}`}
                onClick={() => setView('lyrics')}
            >
                Lyrics Translator
            </button>
            <button
                className={`nav-button ${currentView === 'youtube' ? 'active' : ''}`}
                onClick={() => setView('youtube')}
            >
                YouTube Downloader
            </button>
            <button
                className={`nav-button ${currentView === 'converter' ? 'active' : ''}`}
                onClick={() => setView('converter')}
            >
                Kanji to Romaji
            </button>
        </div>
    );
};

export default Navbar;
