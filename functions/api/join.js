const RESEND = 'https://api.resend.com/emails';

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

    // --- Admin notification email ---
    const adminBody = [
      'Dear CSU Alumni VN,',
      '',
      'A new member has submitted their profile information via the website.',
      '',
      `Full name:           ${name}`,
      `Email:               ${email}`,
      `Program:             ${program}`,
      `Cohort / Graduation: ${cohort}`,
      `Purpose:             ${intent}`,
      `LinkedIn / Website:  ${linkedin}`,
      `Bio:                 ${bio}`,
      `Message:             ${message}`,
      '',
      'Best regards,',
      'CSU Alumni VN Website',
    ].join('\n');

    const adminPayload = {
      from:     'CSU Alumni VN <noreply@csualumnivn.org>',
      to:       ['csualumnivn@gmail.com'],
      reply_to: email || undefined,
      subject:  `New profile submission — ${name}`,
      text:     adminBody,
    };

    if (photo && photo.size > 0 && photo.size <= 2 * 1024 * 1024) {
      const buf   = await photo.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary  = '';
      const chunk = 8192;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
      }
      adminPayload.attachments = [{ filename: photo.name, content: btoa(binary) }];
    }

    // --- Auto-reply email to submitter ---
    const hasPhoto = photo && photo.size > 0 && photo.size <= 2 * 1024 * 1024;
    const receivedLine = hasPhoto
      ? 'We have received your profile and will review it.'
      : 'We have received your information and will review it.';

    const autoReplyBody = [
      `Dear ${name},`,
      '',
      'Thank you for submitting your information to CSU Alumni VN - The power of networking!',
      '',
      `${receivedLine} Our team will be in touch with you as soon as possible.`,
      '',
      'In the meantime, stay connected with our community and follow our latest activities at:',
      'https://csualumnivn.org/',
      '',
      'For and on behalf of CSU Alumni VN - The power of networking',
      '',
      'Yours sincerely,',
      '',
      'Nguyen Ngoc Trang (Thai Hai Ly)',
    ].join('\n');

    const autoReplyPayload = {
      from:     'CSU Alumni VN <noreply@csualumnivn.org>',
      to:       [email],
      reply_to: 'csualumnivn@gmail.com',
      subject:  'Thank you for your submission — CSU Alumni VN',
      text:     autoReplyBody,
    };

    // Send both emails in parallel
    const headers = { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' };
    const [adminRes, replyRes] = await Promise.all([
      fetch(RESEND, { method: 'POST', headers, body: JSON.stringify(adminPayload) }),
      email ? fetch(RESEND, { method: 'POST', headers, body: JSON.stringify(autoReplyPayload) }) : Promise.resolve({ ok: true }),
    ]);

    if (!adminRes.ok) {
      const err = await adminRes.text();
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
