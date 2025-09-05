// netlify/functions/updateTask.js (VERSIÓN FINAL Y CORREGIDA)

const { google } = require('googleapis');

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const spreadsheetId = process.env.GOOGLE_SHEET_ID;
const sheetName = 'Tareas';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const data = JSON.parse(event.body);

    // Lógica para ACTUALIZAR el estado de una tarea
    if (data.action === 'updateStatus') {
      const { rowNumber, newStatus } = data;
      // ---- INICIO DE LA CORRECCIÓN 1 ----
      // El estado ahora está en la columna F.
      const range = `${sheetName}!F${rowNumber}`;
      // ---- FIN DE LA CORRECCIÓN 1 ----

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        resource: { values: [[newStatus]] },
      });
      return { statusCode: 200, body: JSON.stringify({ message: 'Tarea actualizada' }) };
    }

    // Lógica para CREAR una nueva tarea
    if (data.action === 'create') {
      const { description, dueDate, dueTime, assignedTo } = data;
      const newTaskId = Date.now().toString();
      const newRow = [newTaskId, description, assignedTo, dueDate, dueTime, 'Pendiente'];

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        // ---- INICIO DE LA CORRECCIÓN 2 ----
        // El rango de datos ahora es hasta la columna F.
        range: `${sheetName}!A:F`,
        // ---- FIN DE LA CORRECCIÓN 2 ----
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        resource: { values: [newRow] },
      });
      return { statusCode: 201, body: JSON.stringify({ message: 'Tarea creada' }) };
    }

    return { statusCode: 400, body: JSON.stringify({ error: 'Acción no válida' }) };

  } catch (error) {
    console.error('Error en la función updateTask:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'No se pudo actualizar la tarea.' }),
    };
  }
};