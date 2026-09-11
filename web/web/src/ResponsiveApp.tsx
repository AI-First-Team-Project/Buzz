// 화면 전환 - 좁은 화면에서 기존 Android 앱 표시
import { useEffect, useState, type ReactNode } from 'react';

const MOBILE_QUERY = '(max-width: 768px)';

export function ResponsiveApp({ children }: { children: ReactNode }) {
  const [mobile, setMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches);
  const [mobileLoaded, setMobileLoaded] = useState(mobile);

  useEffect(() => {
    const query = window.matchMedia(MOBILE_QUERY);
    const update = () => {
      setMobile(query.matches);
      if (query.matches) setMobileLoaded(true);
    };
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return (
    <>
      <div style={{ display: mobile ? 'none' : 'contents' }}>{children}</div>
      {mobileLoaded && (
        <iframe
          title="BUZZ 모바일 앱"
          src={`${import.meta.env.BASE_URL}mobile/index.html`}
          allow="microphone; camera"
          style={{
            display: mobile ? 'block' : 'none',
            position: 'fixed',
            inset: 0,
            width: '100%',
            height: '100%',
            border: 0,
            background: '#0A0E1A',
          }}
        />
      )}
    </>
  );
}
