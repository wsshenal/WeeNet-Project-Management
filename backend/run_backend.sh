#!/usr/bin/env bash
# Launcher to start backend with a small local model
set -e
cd "$(dirname "$0")"
if [ -f ".venv/bin/activate" ]; then
  # activate virtualenv if present
  # shellcheck disable=SC1091
  source .venv/bin/activate
fi

# default small model; only set if LOCAL_MODEL not already defined
# pick a CPU‑friendly chat model under ~1GB from gpt4all listings
# we use the model "Llama-3.2-1B-Instruct-Q4_0.gguf" which is about 773MB
: "${LOCAL_MODEL:=Llama-3.2-1B-Instruct-Q4_0.gguf}"
export LOCAL_MODEL

# Keep behavior deterministic across team machines by default.
# Set USE_LLM=1 explicitly when a teammate wants local LLM responses.
: "${USE_LLM:=0}"
export USE_LLM

# Session expiry in hours (JWT). Default 8 hours.
: "${JWT_EXPIRES_HOURS:=8}"
export JWT_EXPIRES_HOURS

# stop any running backend
pkill -f "python3 app.py" || true

# start backend in background and log output
nohup python3 app.py > backend_run.log 2>&1 &
printf "started backend with LOCAL_MODEL=%s USE_LLM=%s JWT_EXPIRES_HOURS=%s (PID=%s)\n" "$LOCAL_MODEL" "$USE_LLM" "$JWT_EXPIRES_HOURS" "$!"
