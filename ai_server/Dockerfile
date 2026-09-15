FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    TF_CPP_MIN_LOG_LEVEL=2

WORKDIR /app

# libsndfile is used by soundfile/librosa. ffmpeg keeps MP3 uploads working.
RUN apt-get update \
    && apt-get install --no-install-recommends -y ffmpeg libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

COPY ai_server/requirements-docker.txt /app/ai_server/requirements-docker.txt
RUN pip install --upgrade pip \
    && pip install -r /app/ai_server/requirements-docker.txt

COPY ai_server/app /app/ai_server/app
COPY ai_model/src /app/ai_model/src
COPY ai_model/models/cnn.keras /app/ai_model/models/cnn.keras

EXPOSE 8000

CMD ["uvicorn", "ai_server.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
