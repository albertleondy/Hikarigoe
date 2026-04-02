import React, { useState, useRef, useEffect } from 'react';

const MarqueeTitle = ({ text, className = '', style = {} }) => {
    const containerRef = useRef(null);
    const textRef = useRef(null);
    const [isOverflowing, setIsOverflowing] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        if (textRef.current && containerRef.current) {
            setIsOverflowing(textRef.current.scrollWidth > containerRef.current.clientWidth);
        }
    }, [text]);

    return (
        <div
            ref={containerRef}
            className={`w-full relative min-w-0 overflow-hidden whitespace-nowrap ${className}`}
            style={{ ...style }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div
                ref={textRef}
                style={{
                    display: 'inline-block',
                    whiteSpace: 'nowrap',
                    paddingBottom: '2px',
                    transform: isHovered && isOverflowing && containerRef.current
                        ? `translateX(calc(${containerRef.current.clientWidth}px - ${textRef.current.scrollWidth}px))`
                        : 'translateX(0)',
                    transition: isHovered && isOverflowing ? 'transform 4s linear' : 'transform 0.5s ease-out',
                }}
            >
                {text}
            </div>
            {!isHovered && isOverflowing && (
                <div className="absolute right-0 top-0 bottom-0 w-5 bg-gradient-to-r from-transparent to-base-300 pointer-events-none" />
            )}
        </div>
    );
};

export default MarqueeTitle;
