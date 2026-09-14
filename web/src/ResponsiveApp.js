import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
// 화면 전환 - 좁은 화면에서 기존 Android 앱 표시
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
const MOBILE_QUERY = '(max-width: 768px)';
const ROUTE_TO_MOBILE_PAGE = { '/': 'home', '/sites': 'site', '/monitoring': 'analysis', '/analysis': 'analysis', '/history': 'history', '/settings': 'settings', '/sound-test': 'test' };
export function ResponsiveApp({ children }) {
    const location = useLocation();
    const [mobile, setMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches);
    const [mobileLoaded, setMobileLoaded] = useState(mobile);
    useEffect(() => {
        const query = window.matchMedia(MOBILE_QUERY);
        const update = () => {
            setMobile(query.matches);
            if (query.matches)
                setMobileLoaded(true);
        };
        update();
        query.addEventListener('change', update);
        return () => query.removeEventListener('change', update);
    }, []);
    const mobilePage = ROUTE_TO_MOBILE_PAGE[location.pathname] ?? 'home';
    return (_jsxs(_Fragment, { children: [_jsx("div", { style: { display: mobile ? 'none' : 'contents' }, children: children }), mobileLoaded && (_jsx("iframe", { key: mobilePage, title: "BUZZ 모바일 앱", src: `${import.meta.env.BASE_URL}mobile/index.html?page=${mobilePage}`, allow: "microphone; camera", style: {
                    display: mobile ? 'block' : 'none',
                    position: 'fixed',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    border: 0,
                    background: '#f7f3ea',
                } }))] }));
}
