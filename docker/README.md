# Buzz FastAPI + MySQL Docker runbook

This Docker milestone runs the FastAPI AI server and MySQL 8.4. The web
frontend, Android app, training workflow, and audio simulator worker remain on
the Windows host.

## Run

From the project root:

```powershell
Copy-Item .env.example .env
# Edit .env and replace both placeholder passwords.
docker compose up --build
```

The API is available at:

- Health: <http://localhost:8000/health>
- Swagger: <http://localhost:8000/docs>

The API loads `ai_model/models/cnn.keras` and connects to `mysql:3306` on the
private Compose network. MySQL is not published to a Windows host port. The
existing `mysql.sql` is mounted read-only into
`/docker-entrypoint-initdb.d/001-schema.sql` and is applied only when the named
volume is initialized for the first time.

## Verify

```powershell
docker compose ps
curl.exe http://localhost:8000/health
curl.exe -F "file=@C:\path\to\sample.wav" http://localhost:8000/api/test/analyze
curl.exe "http://localhost:8000/api/analysis-logs?limit=5&analysis_type=test"
docker compose exec mysql mysql -u buzz_app -p buzz
```

In the health response, `status` must be `ok` and `model` must be `CNN`. A
successful prediction response contains `prediction.label`,
`prediction.probabilities`, and `meta.modelName`.

The existing web SoundTest already defaults to `http://localhost:8000`, so run
it on Windows as usual and upload a WAV or MP3. For a physical Android device,
set `VITE_API_BASE_URL=http://<WINDOWS_PC_IP>:8000` before building the app.

The existing audio simulator can also call the container through the published
host port. Keep its audio outside the image and run it from the project root:

```powershell
$env:BUZZ_SIMULATOR_AUDIO_ROOT = "D:\path\to\audio_simulator"
$env:BUZZ_SIMULATOR_API_URL = "http://127.0.0.1:8000/api/auto/analyze-batch"
.\.venv\Scripts\python.exe -m ai_server.app.workers.audio_simulator
```

The audio root must contain `site1`, `site2`, and `site3` folders. WAV and MP3
files are intentionally excluded from the Docker build context.

## Operations

```powershell
# Follow logs for both services
docker compose logs -f mysql ai-server

# Stop containers while preserving MySQL data in the named volume
docker compose down

# Stop containers and delete the MySQL volume (next start reapplies mysql.sql)
docker compose down -v

# Rebuild after server, model, or dependency changes
docker compose build --no-cache ai-server
docker compose up -d ai-server
```

`docker compose down` preserves `mysql_data`; `docker compose down -v` deletes
it and permanently removes the local database contents. Do not use `-v` when
the data must be retained.
