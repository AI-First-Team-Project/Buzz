import { Component } from 'react';

export class AppErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) { return { error }; }

  componentDidCatch(error, info) {
    console.error('BUZZ 화면 렌더링 오류', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return <main className="app-error" role="alert">
      <section>
        <span>BUZZ</span>
        <h1>화면을 불러오지 못했습니다.</h1>
        <p>일시적인 데이터 또는 화면 오류가 발생했습니다. 다른 데이터는 안전하게 유지됩니다.</p>
        <div><button onClick={() => this.setState({ error: null })}>다시 시도</button><button onClick={() => { window.location.hash = '#/'; window.location.reload(); }}>대시보드로 이동</button></div>
      </section>
    </main>;
  }
}
