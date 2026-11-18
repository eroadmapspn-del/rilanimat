"""Stage 0 (story reels only): the creator gives a topic, the story writer pitches a story, and they refine it by chat."""
from __future__ import annotations

from ..domain.project import blank_final, blank_voice, is_story
from ..errors import InvalidInput, WorkflowError
from .context import Context


class StoryService:
    def __init__(self, ctx: Context):
        self.ctx = ctx

    def _load_story_project(self, pid: str) -> dict:
        project = self.ctx.repo.load(pid)
        if not is_story(project["brief"]):
            raise WorkflowError("This reel has no story step.")
        return project

    def generate(self, pid: str) -> bool:
        """Write the first story from the topic (also used to throw the story away and start over)."""
        self._load_story_project(pid)
        return self._start(pid, feedback="", fresh=True)

    def revise(self, pid: str, message: str) -> bool:
        """The creator says what to change in the chat; the writer rewrites the story."""
        message = (message or "").strip()
        if not message:
            raise InvalidInput("Tell the writer what to change.")
        project = self._load_story_project(pid)
        if not project["story"].get("data"):
            raise WorkflowError("Write a story first.")
        return self._start(pid, feedback=message, fresh=False)

    def _start(self, pid: str, feedback: str, fresh: bool) -> bool:
        repo = self.ctx.repo

        def job() -> None:
            def begin(p: dict) -> None:
                previous = None if fresh else p["story"]["data"]
                messages = [] if fresh else p["story"]["messages"]
                story = {"status": "running", "data": previous, "error": None, "messages": messages}
                if feedback:
                    story["messages"] = [*story["messages"], {"role": "user", "text": feedback}]
                p["story"] = story
                self._unwind(p)
            repo.update(pid, begin)
            project = repo.load(pid)
            data = self.ctx.story_writer.write(
                project["brief"], project["story"]["data"], feedback, lambda m: self.ctx.log(pid, m)
            )

            def done(p: dict) -> None:
                reply = "Here is my first pitch. Tell me what to change." if fresh else "Done. Tell me what else to change."
                p["story"].update({"status": "done", "data": data, "error": None})
                p["story"]["messages"] = [*p["story"]["messages"], {"role": "writer", "text": reply}]
            repo.update(pid, done)
            self.ctx.log(pid, "Story ready. Read it, ask for changes, or approve it.")

        return self.ctx.jobs.start(pid, "story", job)

    def approve(self, pid: str) -> None:
        project = self._load_story_project(pid)
        if project["story"]["status"] != "done" or not project["story"].get("data"):
            raise WorkflowError("No story to approve yet.")
        self.ctx.repo.update(pid, lambda p: p["approved"].__setitem__("story", True))
        self.ctx.log(pid, "Story approved. Writing the script is next.")

    def reopen(self, pid: str) -> None:
        """Take back the approval so the story can be edited again (this clears everything built from it)."""
        self._load_story_project(pid)
        self.ctx.repo.update(pid, self._unwind)
        self.ctx.log(pid, "Story reopened. The script, voice-over and scenes were cleared.")

    @staticmethod
    def _unwind(p: dict) -> None:
        """A changed story invalidates the script and everything built from it."""
        for stage in ("story", "script", "voice", "scenes"):
            p["approved"][stage] = False
        p["script"] = {"status": "idle", "data": None, "error": None}
        p["voice"] = blank_voice()
        p["scenes"] = {}
        p["final"] = blank_final()
