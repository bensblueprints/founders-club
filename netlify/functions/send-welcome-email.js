// Welcome Email Notification Function
// Uses Resend API for email delivery

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'Founders Vietnam <noreply@foundersvietnam.com>';

exports.handler = async (event, context) => {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            body: ''
        };
    }

    // Only allow POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const body = JSON.parse(event.body);
        const { email, firstName, lastName, tempPassword, type = 'welcome' } = body;

        if (!email) {
            return {
                statusCode: 400,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: 'Email is required' })
            };
        }

        // Check if Resend API key is configured
        if (!RESEND_API_KEY) {
            console.log('Resend API not configured, logging email instead');
            console.log('Would send email to:', email);
            console.log('Type:', type);
            console.log('Name:', firstName, lastName);

            return {
                statusCode: 200,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({
                    success: true,
                    message: 'Email logged (API not configured)',
                    mock: true
                })
            };
        }

        let subject, htmlContent;

        if (type === 'welcome') {
            subject = 'Welcome to Founders Vietnam - Your Account is Ready';
            htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #1a1a1a; border-radius: 12px; overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid rgba(201, 162, 39, 0.2);">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 300; letter-spacing: 4px;">FOUNDERS</h1>
                            <p style="margin: 5px 0 0; color: #c9a227; font-size: 14px; letter-spacing: 2px;">VIETNAM</p>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="color: #c9a227; font-size: 24px; margin: 0 0 20px; font-weight: 500;">Welcome${firstName ? ', ' + firstName : ''}!</h2>

                            <p style="color: #ffffff; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                                Your admin account for Founders Vietnam has been created. You now have access to manage members, events, and more.
                            </p>

                            <div style="background-color: rgba(201, 162, 39, 0.1); border: 1px solid rgba(201, 162, 39, 0.3); border-radius: 8px; padding: 20px; margin: 30px 0;">
                                <p style="color: #c9a227; font-size: 14px; margin: 0 0 15px; font-weight: 500;">YOUR LOGIN CREDENTIALS</p>
                                <p style="color: #ffffff; font-size: 15px; margin: 0 0 8px;">
                                    <strong>Email:</strong> ${email}
                                </p>
                                <p style="color: #ffffff; font-size: 15px; margin: 0;">
                                    <strong>Temporary Password:</strong> ${tempPassword || '[Set by administrator]'}
                                </p>
                            </div>

                            <p style="color: rgba(255,255,255,0.7); font-size: 14px; line-height: 1.6; margin: 0 0 30px;">
                                For security, please change your password after your first login.
                            </p>

                            <a href="https://foundersvietnam.com/login.html" style="display: inline-block; background: linear-gradient(135deg, #c9a227, #e5c464); color: #1a1a1a; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 500; font-size: 16px;">
                                Login to Your Account
                            </a>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 40px; background-color: rgba(0,0,0,0.3); text-align: center;">
                            <p style="color: rgba(255,255,255,0.5); font-size: 13px; margin: 0;">
                                Founders Vietnam - Where Visionaries Converge
                            </p>
                            <p style="color: rgba(255,255,255,0.3); font-size: 12px; margin: 10px 0 0;">
                                This email was sent to ${email}
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
            `;
        } else if (type === 'password-reset') {
            subject = 'Reset Your Founders Vietnam Password';
            htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #1a1a1a; border-radius: 12px; overflow: hidden;">
                    <tr>
                        <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid rgba(201, 162, 39, 0.2);">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 300; letter-spacing: 4px;">FOUNDERS</h1>
                            <p style="margin: 5px 0 0; color: #c9a227; font-size: 14px; letter-spacing: 2px;">VIETNAM</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="color: #c9a227; font-size: 24px; margin: 0 0 20px;">Password Reset Request</h2>
                            <p style="color: #ffffff; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                                We received a request to reset your password. Click the button below to set a new password.
                            </p>
                            <a href="https://foundersvietnam.com/login.html" style="display: inline-block; background: linear-gradient(135deg, #c9a227, #e5c464); color: #1a1a1a; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 500;">
                                Reset Password
                            </a>
                            <p style="color: rgba(255,255,255,0.5); font-size: 14px; margin: 30px 0 0;">
                                If you didn't request this, you can safely ignore this email.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
            `;
        }

        // Send email via Resend
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: FROM_EMAIL,
                to: email,
                subject: subject,
                html: htmlContent
            })
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('Resend API error:', error);
            return {
                statusCode: 500,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: 'Failed to send email', details: error })
            };
        }

        const result = await response.json();

        return {
            statusCode: 200,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({
                success: true,
                messageId: result.id
            })
        };

    } catch (error) {
        console.error('Email error:', error);
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'Internal server error', message: error.message })
        };
    }
};
