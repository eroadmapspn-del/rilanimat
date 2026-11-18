"""Typed errors. The API layer turns any ReelStudioError into a JSON response with its status."""


class ReelStudioError(Exception):
    status = 400


class NotFound(ReelStudioError):
    status = 404


class InvalidInput(ReelStudioError):
    """The request itself is wrong (missing field, bad value)."""


class WorkflowError(ReelStudioError):
    """The step is not allowed yet (e.g. voice before the script is approved)."""


class InvalidMedia(ReelStudioError):
    """An uploaded file could not be read as audio, video or an image."""


class ProviderError(ReelStudioError):
    """An external service (Gemini) failed."""

    status = 502


class QuotaExceeded(ProviderError):
    """The provider refused because of rate limits or quota."""

    status = 429


class RenderError(ReelStudioError):
    """Remotion or ffmpeg failed."""

    status = 500
