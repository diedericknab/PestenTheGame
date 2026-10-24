# Pesten — kaartspel in een container.
# De code staat in pesten_spel.ipynb; start_pesten.py voert die uit.
FROM python:3.13-slim

WORKDIR /app

# Eerst alleen requirements: een codewijziging hoeft de pip-laag dan niet opnieuw te bouwen.
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Niet als root draaien.
RUN useradd --create-home --uid 10001 spel
COPY --chown=spel:spel pesten_spel.ipynb start_pesten.py ./
COPY --chown=spel:spel templates/ ./templates/
COPY --chown=spel:spel static/ ./static/
# Map voor de database; docker-compose.yml koppelt hier een volume aan.
RUN mkdir -p /app/database && chown spel:spel /app/database
USER spel

ENV SPEL_HOST=0.0.0.0 \
    SPEL_PORT=5000 \
    SPEL_DB=/app/database/pesten.db \
    PYTHONUNBUFFERED=1
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:5000/healthz', timeout=4).status==200 else 1)"

CMD ["python", "start_pesten.py"]
