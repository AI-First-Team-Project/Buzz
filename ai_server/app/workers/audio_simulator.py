"""Feed site1/site2/site3 WAV/MP3 files to FastAPI as real two-second chunks."""
from __future__ import annotations
import asyncio
from dataclasses import dataclass
from io import BytesIO
import logging
import math
from pathlib import Path
from collections.abc import Iterator
import httpx
import librosa
import numpy as np
import soundfile as sf
from ..config import (
    ALLOWED_EXTENSIONS, DURATION_SEC, SAMPLE_RATE, SIMULATOR_API_URL,
    SIMULATOR_AUDIO_ROOT, SIMULATOR_INTERVAL_SECONDS, SIMULATOR_MAX_RETRIES,
    SIMULATOR_QUEUE_SIZE, SIMULATOR_REQUEST_TIMEOUT_SECONDS, SIMULATOR_RETRY_SECONDS,
)
logger = logging.getLogger("buzz.audio_simulator")
SITE_IDS=(1,2,3)
BASE_API = SIMULATOR_API_URL.rsplit('/api/',1)[0]

@dataclass(frozen=True)
class AnalysisJob:
    site_id:int; source_path:Path; chunk_index:int; chunk_start:float; chunk_end:float; wav_bytes:bytes
    @property
    def upload_name(self): return f"{self.source_path.stem}_part_{self.chunk_index+1:05d}.wav"

def discover_audio_files(site_directory:Path)->list[Path]:
    if not site_directory.exists(): return []
    return sorted((p for p in site_directory.iterdir() if p.is_file() and p.suffix.lower() in ALLOWED_EXTENSIONS), key=lambda p:p.name.casefold())

def load_audio(audio_path:Path)->np.ndarray:
    audio,_=librosa.load(audio_path,sr=SAMPLE_RATE,mono=True); return np.asarray(audio,dtype=np.float32)

def split_audio(audio:np.ndarray)->Iterator[tuple[int,np.ndarray,float,float]]:
    n=int(SAMPLE_RATE*DURATION_SEC); total=audio.size/SAMPLE_RATE
    for idx,start in enumerate(range(0,audio.size,n)):
        source=audio[start:start+n]; chunk=np.zeros(n,dtype=np.float32); chunk[:source.size]=source
        yield idx,chunk,idx*DURATION_SEC,min(total,(idx+1)*DURATION_SEC)

def encode_wav(audio:np.ndarray)->bytes:
    b=BytesIO(); sf.write(b,audio,SAMPLE_RATE,format='WAV',subtype='PCM_16'); return b.getvalue()

async def control_enabled(client:httpx.AsyncClient)->bool:
    try:
        r=await client.get(f"{BASE_API}/api/simulator/status"); r.raise_for_status(); return bool(r.json().get('enabled',True))
    except Exception:
        return True

async def report(client:httpx.AsyncClient, job:AnalysisJob|None, state:str, **extra):
    data={'site_id': str(job.site_id if job else extra.pop('site_id')), 'state':state, **{k:str(v) for k,v in extra.items() if v is not None}}
    if job:
        data.update({'current_file':job.source_path.name,'chunk_index':str(job.chunk_index),'chunk_start':str(job.chunk_start),'chunk_end':str(job.chunk_end)})
    try: await client.post(f"{BASE_API}/api/simulator/report",data=data)
    except Exception: pass

async def produce_site_audio(site_id:int, queue:asyncio.Queue[AnalysisJob], client:httpx.AsyncClient):
    directory=SIMULATOR_AUDIO_ROOT/f"site{site_id}"
    while True:
        if not await control_enabled(client):
            await asyncio.sleep(1); continue
        files=discover_audio_files(directory)
        if not files:
            await report(client,None,'WAITING',site_id=site_id,message='음원 대기',log=f'site{site_id} 폴더에 음원이 없습니다.')
            await asyncio.sleep(SIMULATOR_RETRY_SECONDS); continue
        for path in files:
            while not await control_enabled(client): await asyncio.sleep(1)
            try:
                audio=await asyncio.to_thread(load_audio,path)
                if audio.size==0: continue
                for idx,chunk,start,end in split_audio(audio):
                    job=AnalysisJob(site_id,path,idx,start,end,encode_wav(chunk))
                    await report(client,job,'PLAYING',message='2초 chunk 분석 중',log=f'{path.name} {start:.0f}~{end:.0f}초 분석 시작')
                    await queue.put(job)
                    await asyncio.sleep(SIMULATOR_INTERVAL_SECONDS)
            except asyncio.CancelledError: raise
            except Exception as exc:
                logger.exception('음원 처리 실패')
                await report(client,None,'ERROR',site_id=site_id,message=str(exc),log=f'{path.name} 처리 오류: {exc}')

async def submit(client:httpx.AsyncClient,jobs:list[AnalysisJob])->bool:
    for attempt in range(1,SIMULATOR_MAX_RETRIES+1):
        try:
            r=await client.post(SIMULATOR_API_URL,data={'site_ids':[str(j.site_id) for j in jobs]},files=[('files',(j.upload_name,j.wav_bytes,'audio/wav')) for j in jobs]); r.raise_for_status()
            items=r.json()
            for job,item in zip(jobs,items,strict=True):
                pred=item.get('analysis',{}).get('prediction',{})
                await report(client,job,'RUNNING',prediction=pred.get('label'),confidence=pred.get('confidence'),analysis_id=item.get('analysis',{}).get('analysisId'),message='분석 완료',log=f"chunk {job.chunk_index+1} {pred.get('label')} {float(pred.get('confidence') or 0)*100:.1f}%")
            return True
        except asyncio.CancelledError: raise
        except Exception as exc:
            logger.exception('분석 요청 실패')
            if attempt<SIMULATOR_MAX_RETRIES: await asyncio.sleep(SIMULATOR_RETRY_SECONDS)
    for job in jobs:
        await report(client,job,'ERROR',message='FastAPI 분석 요청 실패',log='API 실패 - normal로 대체하지 않음')
    return False

async def consume(queues:dict[int,asyncio.Queue[AnalysisJob]],client:httpx.AsyncClient):
    while True:
        jobs=[]
        for site_id,q in queues.items():
            try: jobs.append(q.get_nowait())
            except asyncio.QueueEmpty: pass
        if not jobs:
            tasks={asyncio.create_task(q.get()): sid for sid,q in queues.items()}
            done,pending=await asyncio.wait(tasks,return_when=asyncio.FIRST_COMPLETED)
            for t in pending: t.cancel()
            jobs=[t.result() for t in done]
        try: await submit(client,sorted(jobs,key=lambda j:j.site_id))
        finally:
            for j in jobs: queues[j.site_id].task_done()

async def run():
    for sid in SITE_IDS: (SIMULATOR_AUDIO_ROOT/f"site{sid}").mkdir(parents=True,exist_ok=True)
    timeout=httpx.Timeout(SIMULATOR_REQUEST_TIMEOUT_SECONDS)
    async with httpx.AsyncClient(timeout=timeout) as client:
        queues={sid:asyncio.Queue(maxsize=SIMULATOR_QUEUE_SIZE) for sid in SITE_IDS}
        tasks=[asyncio.create_task(consume(queues,client))]+[asyncio.create_task(produce_site_audio(sid,queues[sid],client)) for sid in SITE_IDS]
        await asyncio.gather(*tasks)

def main():
    logging.basicConfig(level=logging.INFO,format='%(asctime)s %(levelname)s %(name)s - %(message)s')
    try: asyncio.run(run())
    except KeyboardInterrupt: logger.info('음원 Worker 종료')
if __name__=='__main__': main()
