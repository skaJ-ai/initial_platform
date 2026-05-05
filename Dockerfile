FROM python:3.11-slim

ARG HTTP_PROXY=http://168.219.61.252:8080
ARG HTTPS_PROXY=http://168.219.61.252:8080
ARG NO_PROXY=localhost,127.0.0.1,host.docker.internal,10.240.248.157

ENV http_proxy=${HTTP_PROXY}
ENV https_proxy=${HTTPS_PROXY}
ENV HTTP_PROXY=${HTTP_PROXY}
ENV HTTPS_PROXY=${HTTPS_PROXY}
ENV no_proxy=${NO_PROXY}
ENV NO_PROXY=${NO_PROXY}

WORKDIR /app

COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt \
    --proxy ${HTTP_PROXY} \
    --trusted-host pypi.org \
    --trusted-host pypi.python.org \
    --trusted-host files.pythonhosted.org

COPY backend/ /app/backend/
COPY final/ /app/final/

RUN python -m compileall /app/backend

EXPOSE 26000
ENV PORT=26000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=5 \
  CMD python -c "import os,sys,urllib.request; port=os.getenv('PORT','26000'); url=f'http://127.0.0.1:{port}/api/health'; sys.exit(0 if urllib.request.urlopen(url, timeout=3).getcode()==200 else 1)"

CMD ["sh", "-c", "uvicorn backend.app:app --host 0.0.0.0 --port ${PORT} --workers 1"]
