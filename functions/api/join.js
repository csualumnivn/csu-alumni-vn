export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.RESEND_API_KEY) {
    return json({ ok: false, error: 'Email service not configured.' }, 500);
  }

  try {
    const formData = await request.formData();
    const name     = formData.get('name')     || '';
    const email    = formData.get('email')    || '';
    const program  = formData.get('program')  || '';
    const cohort   = formData.get('cohort')   || '';
    const intent   = formData.get('intent')   || '';
    const linkedin = formData.get('linkedin') || '';
    const bio      = formData.get('bio')      || '';
    const message  = formData.get('message')  || '';
    const photo    = formData.get('photo');

    const bodyText = [
      'Dear CSU Alumni VN,',
      '',
      'A new member has submitted their profile information via the website.',
      '',
      `Full name:              ${name}`,
      `Email:                  ${email}`,
      `Program:                ${program}`,
      `Cohort / Graduation:    ${cohort}`,
      `Purpose:                ${intent}`,
      `LinkedIn / Website:     ${linkedin}`,
      `Bio:                    ${bio}`,
      `Message:                ${message}`,
      '',
      'Best regards,',
      'CSU Alumni VN Website',
    ].join('\n');

    const payload = {
      from:     'CSU Alumni VN <onboarding@resend.dev>',
      to:       ['csualumnivn@gmail.com'],
      reply_to: email || undefined,
      subject:  `New profile submission — ${name}`,
      text:     bodyText,
    };

    if (photo && photo.size > 0 && photo.size <= 2 * 1024 * 1024) {
      const buf   = await photo.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary  = '';
      const chunk = 8192;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
      }
      payload.attachments = [{ filename: photo.name, content: btoa(binary) }];
    }

    const res  = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.text();
      return json({ ok: false, error: err }, 500);
    }

    return json({ ok: true });

  } catch (err) {
    return json({ ok: false, error: err.message }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}
