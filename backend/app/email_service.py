"""No email provider is configured for this MVP - every "send" logs to the
console instead of failing. Swap the body of send_email() for a real
provider (Resend, SES, Postmark, ...) later; nothing else needs to change."""


def send_email(to: str, subject: str, body: str) -> None:
    print(f"[email:dev] to={to} subject={subject!r}\n{body}\n")
