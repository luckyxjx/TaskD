 -- Add email sending functionality for board invitations
-- This uses Supabase's built-in email service

-- Create a function to send invitation emails
CREATE OR REPLACE FUNCTION send_board_invitation_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_board_name TEXT;
  v_inviter_email TEXT;
  v_app_url TEXT;
BEGIN
  -- Get board name
  SELECT name INTO v_board_name
  FROM boards
  WHERE id = NEW.board_id;

  -- Get inviter email
  SELECT email INTO v_inviter_email
  FROM auth.users
  WHERE id = NEW.invited_by;

  -- Set your app URL (change this to your actual domain)
  v_app_url := 'https://myapp-domain.com'; -- TODO: Update this!

  -- Insert into Supabase's email queue
  -- Note: This requires pg_net extension and proper configuration
  PERFORM
    net.http_post(
      url := 'https://api.resend.com/emails', -- Or your email service
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.resend_api_key', true)
      ),
      body := jsonb_build_object(
        'from', 'TaskD <noreply@your-domain.com>',
        'to', ARRAY[NEW.email],
        'subject', v_inviter_email || ' invited you to collaborate on ' || v_board_name,
        'html', 
          '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">' ||
          '<h2 style="color: #4f678e;">You''ve been invited to collaborate!</h2>' ||
          '<p>' || v_inviter_email || ' has invited you to join the board <strong>' || v_board_name || '</strong> on TaskD.</p>' ||
          '<p>Click the button below to accept the invitation:</p>' ||
          '<a href="' || v_app_url || '/accept-invite?token=' || NEW.token || '" ' ||
          'style="display: inline-block; padding: 12px 24px; background-color: #4f678e; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0;">Accept Invitation</a>' ||
          '<p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>' ||
          '<p style="color: #666; font-size: 12px; word-break: break-all;">' || v_app_url || '/accept-invite?token=' || NEW.token || '</p>' ||
          '<p style="color: #999; font-size: 12px; margin-top: 40px;">This invitation will expire in 7 days.</p>' ||
          '</div>'
      )
    );

  RETURN NEW;
END;
$$;

-- Create trigger to send email when invitation is created
DROP TRIGGER IF EXISTS on_board_invitation_created ON board_invitations;

CREATE TRIGGER on_board_invitation_created
  AFTER INSERT ON board_invitations
  FOR EACH ROW
  EXECUTE FUNCTION send_board_invitation_email();

-- Add comment
COMMENT ON FUNCTION send_board_invitation_email() IS 
'Sends an email invitation when a new board invitation is created. Requires email service configuration.';
