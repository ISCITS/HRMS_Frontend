FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# The container bundles the API code and its Python dependencies into a single runtime image.
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && pip install --no-cache-dir -r requirements.txt

# Source code is copied after dependencies so image rebuilds stay reasonably efficient.
COPY . .

EXPOSE 8000
EXPOSE 5678

# Startup flows through the launcher so debugpy is only enabled when DEBUG_MODE=true.
CMD ["python", "-m", "app.StartServer"]
