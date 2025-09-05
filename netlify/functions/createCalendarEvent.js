// netlify/functions/createCalendarEvent.js (Versión para cuentas de Gmail)

const { google } = require('googleapis');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { summary, dueDate, attendeeEmail, organizerEmail } = JSON.parse(event.body);

    if (!summary || !dueDate || !attendeeEmail || !organizerEmail) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Faltan datos para crear el evento.' }) };
    }

    // --- INICIO DEL CAMBIO 1: Autenticación simplificada (sin 'subject') ---
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });
    // --- FIN DEL CAMBIO 1 ---

    const calendar = google.calendar({ version: 'v3', auth });

    const eventStartDateTime = `${dueDate}T09:00:00`;
    const eventEndDateTime = `${dueDate}T10:00:00`;

    const eventResource = {
      summary: summary,
      description: `Esta es una invitación de calendario para la tarea: "${summary}".`,
      start: {
        dateTime: eventStartDateTime,
        timeZone: 'America/Mexico_City',
      },
      end: {
        dateTime: eventEndDateTime,
        timeZone: 'America/Mexico_City',
      },
      attendees: [{ email: attendeeEmail }],
      conferenceData: {
        createRequest: { requestId: `meet-${Date.now()}` },
      },
    };

    // --- INICIO DEL CAMBIO 2: Se especifica el ID del calendario a usar ---
    await calendar.events.insert({
      calendarId: organizerEmail, // Usamos el correo del organizador como ID del calendario
      resource: eventResource,
      sendNotifications: true,
    });
    // --- FIN DEL CAMBIO 2 ---

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Invitación de calendario enviada con éxito.' }),
    };

  } catch (error) {
    console.error('Error al crear el evento de calendario:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'No se pudo enviar la invitación.' }),
    };
  }
};