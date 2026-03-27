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
                className={`nav-button ${currentView === 'youtube-dl' ? 'active' : ''}`}
                onClick={() => setView('youtube-dl')}
            >
                YouTube Downloader
            </button>
            <button
                className={`nav-button ${currentView === 'youtube-search' ? 'active' : ''}`}
                onClick={() => setView('youtube-search')}
            >
                YouTube Search
            </button>
        </div>
    );
};

export default Navbar;
