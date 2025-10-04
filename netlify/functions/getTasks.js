// netlify/functions/getTasks.js

const { google } = require('googleapis');

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const sheets = google.sheets({ version: 'v4', auth });
const spreadsheetId = process.env.GOOGLE_SHEET_ID;
const sheetName = 'Tareas';

exports.handler = async (event) => {
  const userEmail = event.queryStringParameters.email;
  // CAMBIO: Nuevo parámetro para saber si queremos todas las tareas
  const scope = event.queryStringParameters.scope || 'user'; // 'user' o 'all'
  const projectId = event.queryStringParameters.projectId; // Nuevo parámetro

  if (!userEmail) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'El email del usuario es requerido.' }),
    };
  }

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:G`,
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) {
      return { statusCode: 200, body: JSON.stringify([]) };
    }

    const allTasks = rows.slice(1).map((row, index) => ({
      rowNumber: index + 2,
      id: row[0],
      description: row[1],
      assignedTo: row[2],
      dueDate: row[3],
    // ---- INICIO DEL CAMBIO ----
    dueTime: row[4], // Lee la nueva columna E
    status: row[5],  // El estado ahora está en la columna F
    projectId: row[6] || '', // Nueva propiedad
    // ---- FIN DEL CAMBIO ----
    }));

    // ---- INICIO DE LA SOLUCIÓN DE FILTRADO ----
    let filteredTasks = allTasks;

    // Mensaje de depuración para ver qué projectId se recibe
    console.log(`Filtrando tareas. Recibido projectId: "${projectId}", scope: "${scope}"`);

    // 1. Siempre filtramos por proyecto si se proporciona un projectId.
    if (projectId) {
        filteredTasks = filteredTasks.filter(task => task.projectId === projectId);
    }
    
    // 2. Sobre el resultado anterior, filtramos por usuario si el scope es 'user'.
    if (scope === 'user') {
        filteredTasks = filteredTasks.filter(task => task.assignedTo && task.assignedTo.toLowerCase() === userEmail.toLowerCase());
    }

    return {
      statusCode: 200,
      body: JSON.stringify(filteredTasks),
    };
    // ---- FIN DE LA SOLUCIÓN DE FILTRADO ----

  } catch (error) {
    console.error('Error al leer las tareas:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'No se pudieron obtener las tareas.' }),
    };
  }
};
