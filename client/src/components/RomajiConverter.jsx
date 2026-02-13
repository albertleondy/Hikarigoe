import React, { useState } from 'react';

const RomajiConverter = () => {
    const [text, setText] = useState('');
    const [convertedLines, setConvertedLines] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleConvert = async () => {
        if (!text.trim()) return;

        setLoading(true);
        setError(null);
        setConvertedLines([]);

        try {
            const response = await fetch('http://localhost:3001/api/convert', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text }),
            });

            if (!response.ok) {
                throw new Error('Conversion failed');
            }

            const data = await response.json();
            setConvertedLines(data.results);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="main-content fadeIn">
            {/* LEFT PANEL: INPUT */}
            <div className="panel left-panel" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <h3>Input Japanese Text</h3>
                <textarea
                    className="lyrics-input"
                    placeholder="Paste Japanese lyrics here (Kanji, Hiragana, Katakana)..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    style={{
                        flex: 1,
                        padding: '15px',
                        borderRadius: '12px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        background: 'rgba(0, 0, 0, 0.2)',
                        color: 'white',
                        fontSize: '16px',
                        resize: 'none',
                        fontFamily: 'inherit'
                    }}
                />
                <button
                    className="action-button"
                    onClick={handleConvert}
                    disabled={loading}
                    style={{ alignSelf: 'flex-end', padding: '10px 30px' }}
                >
                    {loading ? 'Converting...' : 'Convert to Romaji'}
                </button>
                {error && <div className="error-message">{error}</div>}
            </div>

            {/* RIGHT PANEL: OUTPUT */}
            <div className="panel right-panel" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <h3>Romaji Output</h3>
                <div className="result-container" style={{ flex: 1, overflowY: 'auto', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '20px' }}>
                    {convertedLines.length > 0 ? (
                        <div className="lyrics-scroll">
                            {convertedLines.map((line, index) => (
                                <div key={index} className="lyric-line">
                                    {line.romaji && <div className="romaji">{line.romaji}</div>}
                                    {line.original && <div className="original">{line.original}</div>}
                                    {!line.original && !line.romaji && <br />}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state">
                            <p>Converted lyrics will appear here</p>
                        </div>
                    )}
                </div>
                {convertedLines.length > 0 && (
                    <button
                        className="action-button copy-button"
                        onClick={() => navigator.clipboard.writeText(convertedLines.map(l => l.romaji).join('\n'))}
                        style={{ alignSelf: 'flex-end' }}
                    >
                        Copy Romaji
                    </button>
                )}
            </div>
        </div>
    );
};

export default RomajiConverter;
