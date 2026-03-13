# Docker Debugging

This project supports remote debugging from VS Code through `debugpy` when `DEBUG_MODE=true`.

## 1. Run The Container

```powershell
docker compose up --build
```

When `DEBUG_MODE=true`, the backend container starts with:

```text
python -m debugpy --listen 0.0.0.0:5678 --wait-for-client -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The process will wait for the debugger to attach before serving requests.

## 2. Wait For The Debugger

Watch the backend container logs and wait until the debugger is listening on port `5678`.

## 3. Open VS Code

Open the project folder in VS Code.

Go to `Run and Debug` and choose `Attach to Docker FastAPI`.

## 4. Set Breakpoints

Place breakpoints in the FastAPI code you want to inspect, for example:

- `app/api/v1/UserRoutes.py`
- `app/services/UserService.py`
- `app/repositories/UserRepository.py`

## 5. Call The API

Trigger the breakpoint by calling the endpoint from PowerShell, curl, Postman, or Swagger UI.

Example:

```powershell
$strPayload = '{"UserID":"admin","Password":"$2b$12$/tWtyuECbYDaMXFT/Qo9eOCEuUe8Wg5W8tHCtXJWv96wbMlwC9Mdi"}'

Invoke-RestMethod `
  -Uri "http://localhost:8000/api/v1/users/validateUser" `
  -Method Post `
  -ContentType "application/json" `
  -Body $strPayload
```

## Production Safety

- `DEBUG_MODE=true` enables `debugpy` and `uvicorn --reload`
- `DEBUG_MODE=false` starts normal `uvicorn` without the debugger

This keeps remote debugging out of normal runtime unless explicitly enabled.
