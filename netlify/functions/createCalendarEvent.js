// netlify/functions/createCalendarEvent.js (VERSIÓN FINAL Y ROBUSTA)

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

    // ---- INICIO DE LA CORRECCIÓN FINAL DE FECHAS ----

    // 1. Establecer la hora. Si no viene, se usa 09:00 por defecto.
    const eventTime = dueTime || '09:00';
    
    // 2. Construir la fecha de inicio en un formato que JavaScript pueda entender.
    const startDateTimeString = `${dueDate}T${eventTime}:00`;
    
    // 3. Crear el objeto de fecha de inicio.
    const startDate = new Date(startDateTimeString);

    // 4. VERIFICACIÓN CRÍTICA: Nos aseguramos de que la fecha sea válida.
    if (isNaN(startDate.getTime())) {
      console.error('Fecha de inicio inválida. Valor recibido:', startDateTimeString);
      return { statusCode: 400, body: JSON.stringify({ error: `El formato de fecha '${dueDate}' o de hora '${dueTime}' es inválido.` }) };
    }

    // 5. Calcular la fecha de fin (1 hora después) de forma segura.
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // Añade 1 hora en milisegundos

    // ---- FIN DE LA CORRECCIÓN FINAL DE FECHAS ----

    const eventResource = {
      summary: summary,
      description: `Evento creado automáticamente para la tarea: "${summary}".`,
      start: {
        dateTime: startDate.toISOString(), // Usamos el formato estándar ISO
        timeZone: 'America/Mexico_City', // Ajusta si es necesario
      },
      end: {
        dateTime: endDate.toISOString(), // Usamos el formato estándar ISO
        timeZone: 'America/Mexico_City',
      },
      conferenceData: {
        createRequest: { requestId: `meet-${Date.now()}` },
      },
    };

    await calendar.events.insert({
      calendarId: organizerEmail,
      resource: eventResource,
      sendNotifications: false, // Cambiado a false para no intentar enviar correos
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