import os
import sys

from app.core.Config import getSettings


def buildStartupCommand() -> list[str]:
    # Container startup flows through this helper so debug and non-debug modes share one entry point.
    objSettings = getSettings()
    lstCommand = [
        sys.executable,
        "-m",
        "uvicorn",
        "app.main:app",
        "--host",
        "0.0.0.0",
        "--port",
        "8000",
    ]

    if objSettings.DEBUG_MODE:
        # Debug mode enables debugpy attach support and hot reload for development inside Docker.
        lstCommand = [
            sys.executable,
            "-m",
            "debugpy",
            "--listen",
            "0.0.0.0:5678",
            "--wait-for-client",
            "-m",
            "uvicorn",
            "app.main:app",
            "--host",
            "0.0.0.0",
            "--port",
            "8000",
            "--reload",
        ]

    return lstCommand


def main() -> None:
    # The launcher replaces itself with the final server process so Docker receives proper signals.
    lstCommand = buildStartupCommand()
    os.execvp(lstCommand[0], lstCommand)


if __name__ == "__main__":
    main()
