// 타입 선언 - Vite 환경 및 CSS 모듈
/// <reference types="vite/client" />

declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
