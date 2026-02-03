import { useEffect, useRef } from 'react';

export default function VideoBackground({ youtubeId }) {
  const iframeRef = useRef(null);

  useEffect(() => {
    // Update iframe when youtubeId changes
    if (iframeRef.current) {
      iframeRef.current.src = `https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&loop=1&playlist=${youtubeId}&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1&enablejsapi=1&origin=${window.location.origin}`;
    }
  }, [youtubeId]);

  return (
    <div className="video-background">
      <iframe
        ref={iframeRef}
        src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&loop=1&playlist=${youtubeId}&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1&enablejsapi=1&origin=${window.location.origin}`}
        title="Ambient Background"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />

      {/* Gradient overlays for better widget visibility */}
      <div className="video-overlay" />

      <style>{`
        .video-background {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: var(--z-background);
          overflow: hidden;
        }
        
        .video-background iframe {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 100vw;
          height: 56.25vw; /* 16:9 aspect ratio */
          min-height: 100vh;
          min-width: 177.78vh; /* 16:9 aspect ratio */
          transform: translate(-50%, -50%);
          pointer-events: none;
        }
        
        .video-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0.2) 0%,
            rgba(0, 0, 0, 0.1) 50%,
            rgba(0, 0, 0, 0.3) 100%
          );
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
