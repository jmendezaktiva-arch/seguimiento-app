// netlify/functions/projects.js

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

exports.handler = async (event) => {
  const { action, projectName, description } = JSON.parse(event.body || '{}');

  // ---- ACCIÓN PARA OBTENER TODOS LOS PROYECTOS ----
  if (event.httpMethod === 'GET') {
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Proyectos!A:D',
      });
      const rows = response.data.values || [];
      const projects = rows.slice(1).map(row => ({
        id: row[0],
        name: row[1],
        description: row[2],
        status: row[3],
      }));
      return { statusCode: 200, body: JSON.stringify(projects) };
    } catch (error) {
      return { statusCode: 500, body: JSON.stringify({ error: 'No se pudieron obtener los proyectos.' }) };
    }
  }

  // ---- ACCIÓN PARA CREAR UN NUEVO PROYECTO ----
  if (event.httpMethod === 'POST' && action === 'createProject') {
    if (!projectName) {
      return { statusCode: 400, body: JSON.stringify({ error: 'El nombre del proyecto es requerido.' }) };
    }
    try {
      const newRow = [
        Date.now().toString(), // ProjectID
        projectName,
        description || '',
        'Activo', // Status por defecto
      ];
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Proyectos!A:D',
        valueInputOption: 'USER_ENTERED',
        resource: { values: [newRow] },
      });
      return { statusCode: 201, body: JSON.stringify({ message: 'Proyecto creado' }) };
    } catch (error) {
      return { statusCode: 500, body: JSON.stringify({ error: 'No se pudo crear el proyecto.' }) };
    }
  }

  return { statusCode: 405, body: 'Method Not Allowed or Invalid Action' };
};