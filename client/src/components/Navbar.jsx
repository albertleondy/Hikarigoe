import React from 'react';

const Navbar = ({ currentView, setView }) => {
    return (
        <div className="tabs tabs-boxed bg-base-300 p-2 mb-2 md:mb-6 flex flex-wrap justify-center overflow-x-auto w-full md:w-auto">
            <button
                className={`tab tab-sm md:tab-lg transition-all ${currentView === 'lyrics' ? 'tab-active' : ''}`}
                onClick={() => setView('lyrics')}
            >
                Lyrics Translator
            </button>
            <button
                className={`tab tab-sm md:tab-lg transition-all ${currentView === 'youtube-dl' ? 'tab-active' : ''}`}
                onClick={() => setView('youtube-dl')}
            >
                YouTube Downloader
            </button>
            <button
                className={`tab tab-sm md:tab-lg transition-all ${currentView === 'youtube-search' ? 'tab-active' : ''}`}
                onClick={() => setView('youtube-search')}
            >
                YouTube Search
            </button>
        </div>
    );
};

export default Navbar;
