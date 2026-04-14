import json
import os
import signal
import struct
import subprocess
import sys
from typing import Any

PID_FILE = os.path.join(os.path.dirname(__file__), "zotify_pid.txt")


def read_message() -> dict[str, Any] | None:
    raw_length = sys.stdin.buffer.read(4)
    if not raw_length:
        return None

    message_length = struct.unpack("<I", raw_length)[0]
    message = sys.stdin.buffer.read(message_length)
    return json.loads(message.decode("utf-8"))


def send_message(message: dict[str, Any]) -> None:
    encoded = json.dumps(message, ensure_ascii=False).encode("utf-8")
    sys.stdout.buffer.write(struct.pack("<I", len(encoded)))
    sys.stdout.buffer.write(encoded)
    sys.stdout.buffer.flush()


def save_pid(pid: int) -> None:
    with open(PID_FILE, "w", encoding="utf-8") as f:
        f.write(str(pid))


def load_pid() -> int | None:
    if not os.path.exists(PID_FILE):
        return None

    try:
        with open(PID_FILE, "r", encoding="utf-8") as f:
            value = f.read().strip()
        return int(value) if value else None
    except Exception:
        return None


def clear_pid() -> None:
    try:
        if os.path.exists(PID_FILE):
            os.remove(PID_FILE)
    except Exception:
        pass


def is_process_running(pid: int) -> bool:
    try:
        if os.name == "nt":
            result = subprocess.run(
                ["tasklist", "/FI", f"PID eq {pid}"],
                capture_output=True,
                text=True,
                check=False
            )
            return str(pid) in result.stdout
        else:
            os.kill(pid, 0)
            return True
    except Exception:
        return False


def open_folder(folder_path: str) -> dict[str, Any]:
    if not folder_path:
        return {"ok": False, "error": "No folder path provided."}

    if not os.path.isdir(folder_path):
        return {"ok": False, "error": f"Folder does not exist: {folder_path}"}

    try:
        os.startfile(folder_path)  # type: ignore[attr-defined]
        return {"ok": True}
    except Exception as exc:
        return {"ok": False, "error": str(exc)}


def kill_zotify() -> dict[str, Any]:
    pid = load_pid()

    if pid is None:
        return {"ok": False, "error": "No stored zotify process found."}

    if not is_process_running(pid):
        clear_pid()
        return {"ok": False, "error": "Stored zotify process is no longer running."}

    try:
        if os.name == "nt":
            subprocess.run(
                ["taskkill", "/PID", str(pid), "/T", "/F"],
                capture_output=True,
                text=True,
                check=False,
            )
        else:
            os.kill(pid, signal.SIGTERM)

        clear_pid()
        return {"ok": True, "message": f"Zotify process {pid} terminated."}
    except Exception as exc:
        return {"ok": False, "error": str(exc)}


def run_zotify(command: list[str]) -> dict[str, Any]:
    if not command:
        return {"ok": False, "error": "No command provided."}

    existing_pid = load_pid()
    if existing_pid is not None and is_process_running(existing_pid):
        return {"ok": False, "error": f"A zotify process is already running (PID {existing_pid})."}

    try:
        startupinfo = None
        creationflags = 0

        if os.name == "nt":
            startupinfo = subprocess.STARTUPINFO()
            startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            startupinfo.wShowWindow = 2  # SW_SHOWMINIMIZED

            creationflags = (
                subprocess.CREATE_NEW_PROCESS_GROUP  # type: ignore[attr-defined]
                | subprocess.DETACHED_PROCESS        # type: ignore[attr-defined]
            )

        process = subprocess.Popen(
            command,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            stdin=subprocess.DEVNULL,
            text=True,
            startupinfo=startupinfo,
            creationflags=creationflags,
            start_new_session=(os.name != "nt"),
        )

        save_pid(process.pid)

        return {
            "ok": True,
            "started": True,
            "pid": process.pid,
        }
    except Exception as exc:
        return {"ok": False, "error": str(exc)}


def main() -> None:
    _ = sys.argv[1:]

    while True:
        try:
            message = read_message()
            if message is None:
                break

            action = str(message.get("action", "")).strip()

            if action == "open_folder":
                result = open_folder(str(message.get("folderPath", "")).strip())
                send_message(result)
                continue

            if action == "kill_zotify":
                result = kill_zotify()
                send_message(result)
                continue

            if action == "run_zotify":
                command = message.get("command", [])
                if not isinstance(command, list):
                    send_message({"ok": False, "error": "Command must be a list."})
                    continue

                result = run_zotify([str(part) for part in command])
                send_message(result)
                continue

            send_message({"ok": False, "error": "Unknown action."})

        except Exception as exc:
            try:
                send_message({"ok": False, "error": str(exc)})
            except Exception:
                break


if __name__ == "__main__":
    main()