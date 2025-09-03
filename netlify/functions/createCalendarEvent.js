// netlify/functions/createCalendarEvent.js

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

    // Configura la autenticación para actuar en nombre del organizador
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/calendar'],
      // Clave para la delegación: actuar en nombre de este usuario
      subject: organizerEmail,
    });

    const calendar = google.calendar({ version: 'v3', auth });

    // Google Calendar necesita fechas en formato ISO. Asumimos un evento de 1 hora a las 9 AM.
    const eventStartDateTime = `${dueDate}T09:00:00`;
    const eventEndDateTime = `${dueDate}T10:00:00`;

    const eventResource = {
      summary: summary,
      description: `Esta es una invitación de calendario para la tarea: "${summary}".`,
      start: {
        dateTime: eventStartDateTime,
        timeZone: 'America/Mexico_City', // Ajusta tu zona horaria si es necesario
      },
      end: {
        dateTime: eventEndDateTime,
        timeZone: 'America/Mexico_City',
      },
      attendees: [{ email: attendeeEmail }],
      conferenceData: {
        createRequest: { requestId: `meet-${Date.now()}` }, // Opcional: crea un enlace de Google Meet
      },
    };

    await calendar.events.insert({
      calendarId: 'primary', // Se inserta en el calendario principal del organizador
      resource: eventResource,
      sendNotifications: true, // Envía las invitaciones por correo electrónico
    });

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