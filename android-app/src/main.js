// BUZZ 앱 - main 모듈
import { jsx as _jsx } from "react/jsx-runtime";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
/* Android(WebView)에서 상태바를 딥 네이비로 맞춤 — 웹에서는 무시됨 */
const isNative = typeof window !== "undefined" && Boolean(window.Capacitor?.isNativePlatform?.());
if (isNative) {
    void import("@capacitor/status-bar").then(({ StatusBar, Style }) => {
        StatusBar.setStyle({ style: Style.Dark });
        StatusBar.setBackgroundColor({ color: "#0A0E1A" });
    }).catch(() => {
        /* 플러그인 미설치 환경에서는 무시 */
    });
}
createRoot(document.getElementById("root")).render(_jsx(StrictMode, { children: _jsx(App, {}) }));
