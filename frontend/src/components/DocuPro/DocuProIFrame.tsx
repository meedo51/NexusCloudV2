import { useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface DocuProIFrameProps {
  app: 'dashboard' | 'word' | 'excel' | 'pdf';
}

export default function DocuProIFrame({ app }: DocuProIFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { token } = useAuth();

  const src = `/docupro/index.html#/${app === 'dashboard' ? '' : app}`;

  useEffect(() => {
    const handleLoad = () => {
      if (iframeRef.current?.contentWindow && token) {
        iframeRef.current.contentWindow.postMessage(
          { type: 'DOCUPRO_AUTH', token },
          window.location.origin
        );
      }
    };

    const iframe = iframeRef.current;
    iframe?.addEventListener('load', handleLoad);
    return () => iframe?.removeEventListener('load', handleLoad);
  }, [token]);

  return (
    <div className="w-full h-full bg-[#0B0E14]">
      <iframe
        ref={iframeRef}
        src={src}
        className="w-full h-full border-0"
        title={`DocuPro ${app}`}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    </div>
  );
}
