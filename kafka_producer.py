from fastapi import FastAPI, UploadFile, File
from kafka import KafkaProducer
from pathlib import Path
from datetime import datetime, timezone, timedelta
import json
import uuid
import shutil
import uvicorn

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# [추가 9월 2일 14:35] 프론트엔드에서 FastAPI 업로드 API 호출을 허용하기 위해 CORS 설정 추가
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# [추가 9월 2일 14:15] 업로드된 음원을 저장할 프로젝트 내 data/raw 폴더 지정
BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "data" / "raw"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# [추가 9월 2일 14:15] KST 타임존 정의
KST = timezone(timedelta(hours=9))

# [추가 9월 2일 14:15] 업로드된 음원 정보를 Kafka로 전송하기 위한 Producer 생성
producer = KafkaProducer(
    bootstrap_servers=["localhost:9092"],
    value_serializer=lambda v: json.dumps(v).encode("utf-8")
)

# [추가 9월 2일 14:15] 음원 입력 이벤트를 전달할 Kafka topic 지정
TOPIC = "audio-input"


@app.post("/upload")
async def upload_audio(file: UploadFile = File(...)):

    # [추가 9월 2일 14:15] wav, mp3 파일만 업로드 허용
    extension = Path(file.filename).suffix.lower()

    if extension not in [".wav", ".mp3"]:
        return {
            "success": False,
            "message": "wav 또는 mp3 파일만 업로드할 수 있습니다."
        }

    # [추가 9월 2일 14:15] 같은 이름의 파일 충돌을 방지하기 위해 고유 file_id 생성
    file_id = f"audio_{uuid.uuid4().hex[:12]}"

    # [추가 9월 2일 14:15] 원래 확장자를 유지한 저장 파일명 생성
    saved_filename = f"{file_id}{extension}"
    saved_path = UPLOAD_DIR / saved_filename

    # [추가 9월 2일 14:15] 프론트엔드에서 받은 음원 파일을 data/raw에 저장
    with open(saved_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # [추가 9월 2일 14:35] 프론트엔드에서 업로드한 원본 파일명을 Kafka 메시지에 포함
    message = {
        "event_id": f"evt_{uuid.uuid4().hex[:12]}",
        "file_id": file_id,
        "original_filename": file.filename,
        "file_path": str(saved_path),
        "source": "frontend_upload",
        "created_at": datetime.now(KST).isoformat(timespec="milliseconds")
    }

    # [추가 9월 2일 14:15] 음원 저장 완료 후 Kafka audio-input 토픽으로 이벤트 전송
    producer.send(TOPIC, value=message)
    producer.flush()

    print("Kafka 전송:", message)

    return {
        "success": True,
        "message": "음원 업로드 완료",
        "data": message
    }


# [추가 9월 2일 14:15] kafka_producer.py를 직접 실행해도 FastAPI 서버가 계속 실행되도록 Uvicorn 시작
if __name__ == "__main__":
    uvicorn.run(
        "kafka_producer:app",
        host="0.0.0.0",
        port=8000,
        reload=False
    )