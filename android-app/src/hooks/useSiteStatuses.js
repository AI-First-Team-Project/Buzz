import { useEffect, useState } from "react";
import { fetchSiteStatuses } from "../api/buzzApi";
import { SITES } from "../types";


function percent(value) {
  return Math.round((Number(value) || 0) * 1000) / 10;
}

function analysisLabel(site) {
  const age = site.last_analysis_age_seconds;
  if (age == null) return "분석 대기 중";
  if (site.worker_status === "DEGRADED") return `수신 지연 · ${Math.floor(age)}초 전`;
  if (age < 2) return "방금 전";
  return `${Math.floor(age)}초 전`;
}

function adaptSite(site) {
  return {
    id: site.site_id,
    name: site.site_name,
    status: site.status.toLowerCase(),
    insect: site.detected_class === "wasp" ? "wasps" : null,
    count: site.consecutive_wasp,
    confidence: percent(site.confidence),
    probabilities: {
      wasp: percent(site.probabilities?.wasp),
      nonWasp: percent(site.probabilities?.non_wasp),
    },
    door: site.door_status.toLowerCase(),
    lastAnalyzedAt: analysisLabel(site),
    workerStatus: site.worker_status.toLowerCase(),
    latestAnalysisId: site.latest_analysis_id,
  };
}

export function useSiteStatuses(pollIntervalMs = 2000) {
  const [sites, setSites] = useState(() => SITES.map((site) => ({
    ...site,
    status: "normal",
    insect: null,
    count: 0,
    confidence: 0,
    probabilities: { wasp: 0, nonWasp: 0 },
    door: "open",
    lastAnalyzedAt: "연결 중",
    workerStatus: "waiting",
  })));
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        const response = await fetchSiteStatuses();
        if (!active) return;
        setSites(response.map(adaptSite));
        setError("");
      } catch (requestError) {
        if (active) {
          setError(requestError.message || "사업장 상태를 불러오지 못했습니다.");
          setSites((previous) => previous.map((site) => ({
            ...site,
            workerStatus: "degraded",
            lastAnalyzedAt: "서버 연결 지연",
          })));
        }
      }
    }

    refresh();
    const timer = window.setInterval(refresh, pollIntervalMs);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [pollIntervalMs]);

  return { sites, setSites, error };
}
