"""
Email service for sending verification codes and notifications
Replace with real email service (SendGrid, Mailgun, AWS SES) in production
"""
import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)

class EmailService:
    """Email service - currently logs to console, can be replaced with real email provider"""
    
    def __init__(self):
        self.enabled = os.environ.get('EMAIL_ENABLED', 'false').lower() == 'true'
        self.from_email = os.environ.get('EMAIL_FROM', 'noreply@quickone.com')
    
    async def send_verification_code(self, to_email: str, code: str, name: str = "User"):
        """Send email verification code"""
        subject = "Verify your QuickOne account"
        body = f"""
Hi {name}!

Your verification code is: {code}

This code expires in 10 minutes.

If you didn't create an account, please ignore this email.

Best regards,
QuickOne Team
        """
        
        return await self._send_email(to_email, subject, body)
    
    async def send_withdrawal_notification(self, to_email: str, amount: float, status: str, name: str = "Provider"):
        """Send withdrawal status notification"""
        subject = f"Withdrawal {status}"
        body = f"""
Hi {name}!

Your withdrawal request of ₦{amount:,.0f} has been {status}.

Best regards,
QuickOne Team
        """
        
        return await self._send_email(to_email, subject, body)
    
    async def send_booking_notification(self, to_email: str, message: str, name: str = "User"):
        """Send booking notification"""
        subject = "QuickOne Booking Update"
        body = f"""
Hi {name}!

{message}

Best regards,
QuickOne Team
        """
        
        return await self._send_email(to_email, subject, body)
    
    async def _send_email(self, to_email: str, subject: str, body: str) -> bool:
        """
        Internal method to send email
        Replace this with real email provider integration
        """
        if self.enabled:
            # TODO: Replace with real email service (SendGrid, Mailgun, AWS SES)
            # Example for SendGrid:
            # from sendgrid import SendGridAPIClient
            # from sendgrid.helpers.mail import Mail
            # 
            # message = Mail(
            #     from_email=self.from_email,
            #     to_emails=to_email,
            #     subject=subject,
            #     plain_text_content=body
            # )
            # sg = SendGridAPIClient(os.environ.get('SENDGRID_API_KEY'))
            # response = sg.send(message)
            # return response.status_code == 202
            
            logger.info(f"[EMAIL MOCK] Would send email to {to_email}")
            logger.info(f"Subject: {subject}")
            logger.info(f"Body:\n{body}")
            return True
        else:
            # For development: just log the email
            logger.info("="*60)
            logger.info(f"[EMAIL] To: {to_email}")
            logger.info(f"[EMAIL] Subject: {subject}")
            logger.info(f"[EMAIL] Body:\n{body}")
            logger.info("="*60)
            return True

# Singleton instance
email_service = EmailService()
