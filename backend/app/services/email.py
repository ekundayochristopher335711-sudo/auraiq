import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from app.core.config import settings


def _html(otp: str, purpose: str) -> str:
    title = "Email Verification" if purpose == "verify_email" else "Password Reset"
    action = "verify your AuraIQ account" if purpose == "verify_email" else "reset your password"
    return f"""<!DOCTYPE html><html><body style="margin:0;padding:20px;font-family:Inter,sans-serif;background:#f3f4f6">
  <div style="max-width:480px;margin:0 auto;background:#111;color:#fff;border-radius:16px;overflow:hidden">
    <div style="background:#7c3aed;padding:24px 32px">
      <span style="font-weight:700;font-size:20px">AuraIQ</span>
      <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:14px">{title}</p>
    </div>
    <div style="padding:32px">
      <p style="color:#9ca3af;margin:0 0 8px">Use this code to {action}:</p>
      <div style="background:#1a1a1a;border-radius:12px;padding:28px;text-align:center;letter-spacing:16px;font-size:40px;font-weight:700;color:#7c3aed;margin:20px 0">{otp}</div>
      <p style="color:#6b7280;font-size:13px;margin:0">Expires in <strong>10 minutes</strong>. If you didn't request this, ignore this email.</p>
    </div>
  </div>
</body></html>"""


def send_otp_email(to_email: str, otp: str, purpose: str) -> bool:
    subject = "Verify your AuraIQ account" if purpose == "verify_email" else "Reset your AuraIQ password"

    # No SMTP configured — print to console (visible in Render logs)
    if not settings.SMTP_HOST:
        print(f"\n{'='*50}")
        print(f"[AuraIQ OTP] To: {to_email}")
        print(f"[AuraIQ OTP] Purpose: {purpose}")
        print(f"[AuraIQ OTP] Code: {otp}")
        print(f"{'='*50}\n")
        return True

    # Always log OTP so it's visible in Render logs as fallback
    print(f"\n{'='*50}")
    print(f"[AuraIQ OTP] To: {to_email}")
    print(f"[AuraIQ OTP] Purpose: {purpose}")
    print(f"[AuraIQ OTP] Code: {otp}")
    print(f"{'='*50}\n")

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = f"AuraIQ <{settings.SMTP_FROM}>"
        msg["To"]      = to_email
        msg.attach(MIMEText(_html(otp, purpose), "html"))

        ctx = ssl.create_default_context()
        with smtplib.SMTP_SSL(settings.SMTP_HOST, int(settings.SMTP_PORT), context=ctx) as s:
            s.login(settings.SMTP_USER, settings.SMTP_PASS)
            s.sendmail(settings.SMTP_FROM, to_email, msg.as_string())
        return True
    except Exception as e:
        print(f"[Email] Send failed: {e}")
        return False
