import { useEffect, useState } from "react";
import { fetchHistory } from "../api/buzzApi";


function percent(value) {
  return Math.round((Number(value) || 0) * 1000) / 10;
}

function adaptHistoryItem(item) {
  const timestamp = new Date(item.timestamp);
  const confidence = percent(item.confidence);
  const wasp = item.result === "wasp" ? confidence : item.result === "non_wasp" ? 100 - confidence : 0;
  const nonWasp = item.result === "non_wasp" ? confidence : item.result === "wasp" ? 100 - confidence : 0;
  const type = item.type === "recovery" ? "normal" : item.type;
  const door = item.door_status === "CLOSED" ? "닫힘" : "열림";
  const result = item.result === "wasp" ? "말벌" : item.result === "non_wasp" ? "말벌 아님" : "판정 없음";
  const flow = type === "danger"
    ? ["말벌 위험 감지", "위험 상태 전환", "문 상태 확인"]
    : type === "gate"
      ? ["문 제어 요청", item.action, "이력 저장"]
      : ["연속 미탐지 확인", "정상 상태 복귀", "이력 저장"];

  return {
    id: item.id,
    type,
    site: item.site_name,
    date: timestamp.toISOString().slice(0, 10),
    time: timestamp.toLocaleTimeString("ko-KR", { hour12: false }),
    title: item.title,
    result,
    confidence,
    door,
    action: item.action,
    probs: { wasp: Math.max(0, wasp), nonWasp: Math.max(0, nonWasp) },
    flow,
    analysisId: item.analysis_id,
  };
}

export function useHistory(pollIntervalMs = 2000) {
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        const response = await fetchHistory();
        if (!active) return;
        setHistory(response.map(adaptHistoryItem));
        setError("");
      } catch (requestError) {
        if (active) setError(requestError.message || "이력을 불러오지 못했습니다.");
      }
    }
    refresh();
    const timer = window.setInterval(refresh, pollIntervalMs);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [pollIntervalMs]);

  return { history, error };
}
