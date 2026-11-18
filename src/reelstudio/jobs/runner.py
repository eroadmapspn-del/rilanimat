"""Background jobs. One job of each kind per project at a time; failures are reported, never lost.

This is an in-process thread runner. The interface (start / running) is small on purpose, so it can
be replaced by a real queue (RQ, Celery) later without touching the services.
"""
from __future__ import annotations

import threading
from collections.abc import Callable

OnError = Callable[[str, str, Exception], None]  # (project id, job kind, exception)


class JobRunner:
    def __init__(self, on_error: OnError, *, synchronous: bool = False):
        self._on_error = on_error
        self._synchronous = synchronous  # tests run jobs inline
        self._running: set[tuple[str, str]] = set()
        self._lock = threading.Lock()

    def start(self, pid: str, kind: str, fn: Callable[[], None]) -> bool:
        key = (pid, kind)
        with self._lock:
            if key in self._running:
                return False
            self._running.add(key)

        def run() -> None:
            try:
                fn()
            except Exception as exc:  # noqa: BLE001 - every failure must reach the UI
                self._on_error(pid, kind, exc)
            finally:
                with self._lock:
                    self._running.discard(key)

        if self._synchronous:
            run()
        else:
            threading.Thread(target=run, daemon=True, name=f"job-{kind}-{pid}").start()
        return True

    def running(self, pid: str) -> list[str]:
        with self._lock:
            return [kind for (p, kind) in self._running if p == pid]
