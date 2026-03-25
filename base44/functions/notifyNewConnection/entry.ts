import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { x_handle, email, app_user_email } = await req.json();

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: "nick@localmaps.me",
      subject: "New X Account Connected – THRFT Airdrop",
      body: `A new user has connected their X account.\n\nX Handle: @${x_handle}\nEmail: ${email}\nApp User Email: ${app_user_email}`,
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});