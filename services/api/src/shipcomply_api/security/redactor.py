import logging
import re
from typing import Any

_PII_PATTERNS = [
    re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'),
    re.compile(r'\b\d{10,13}\b'),
    re.compile(r'(?i)(password|token|secret|api_key|private_key)\s*[:=]\s*\S+'),
    re.compile(r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b'),
]


class PIIRedactor(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.msg = _redact(str(record.msg))
        record.args = tuple(_redact(str(a)) for a in (record.args or ()))
        return True


def _redact(text: str) -> str:
    for pattern in _PII_PATTERNS:
        text = pattern.sub("[REDACTED]", text)
    return text


def install_pii_log_filter() -> None:
    root = logging.getLogger()
    root.addFilter(PIIRedactor())
