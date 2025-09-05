// netlify/functions/createCalendarEvent.js (VERSIÓN FINAL CON CORRECCIÓN DE ZONA HORARIA)

const { google } = require('googleapis');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { summary, dueDate, dueTime, organizerEmail } = JSON.parse(event.body);

    if (!summary || !dueDate || !organizerEmail) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Faltan datos para crear el evento.' }) };
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });

    const calendar = google.calendar({ version: 'v3', auth });

    // ---- INICIO DE LA CORRECCIÓN DE ZONA HORARIA ----

    const userTimeZone = 'America/Mexico_City';
    let eventTime = dueTime || '09:00';
    const timeRegex = /^\d{2}:\d{2}$/;
    if (!timeRegex.test(eventTime)) {
      console.warn(`Formato de hora inválido: "${eventTime}". Se usará 09:00.`);
      eventTime = '09:00';
    }

    // 1. Construimos la hora de inicio como un string de texto simple.
    const startDateTimeLocal = `${dueDate}T${eventTime}:00`;

    // 2. Calculamos la hora de fin (1 hora después) como un string.
    const [hours, minutes] = eventTime.split(':').map(Number);
    const endHour = (hours + 1).toString().padStart(2, '0');
    const endDateTimeLocal = `${dueDate}T${endHour}:${minutes.toString().padStart(2, '0')}:00`;
    
    // ---- FIN DE LA CORRECCIÓN DE ZONA HORARIA ----

    const eventResource = {
      summary: summary,
      description: `Evento creado automáticamente para la tarea: "${summary}".`,
      start: {
        dateTime: startDateTimeLocal, // Enviamos la hora local directamente
        timeZone: userTimeZone,       // Y le decimos a Google en qué zona horaria está
      },
      end: {
        dateTime: endDateTimeLocal,   // Hacemos lo mismo para la hora de fin
        timeZone: userTimeZone,
      },
      conferenceData: {
        createRequest: { requestId: `meet-${Date.now()}` },
      },
    };

    await calendar.events.insert({
      calendarId: organizerEmail,
      resource: eventResource,
      sendNotifications: false,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Evento creado en el calendario con éxito.' }),
    };

  } catch (error) {
    console.error('Error detallado en createCalendarEvent:', error.response ? error.response.data : error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'No se pudo crear el evento en el calendario.' }),
    };
  }
};