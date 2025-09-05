// netlify/functions/getUsers.js

const { google } = require('googleapis');

exports.handler = async (event, context) => {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // ---- INICIO DEL CAMBIO 1: Ampliar el rango para incluir la Columna A ----
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Usuarios!A2:C', 
    });
    // ---- FIN DEL CAMBIO 1 ----

    const rows = response.data.values;
    if (rows && rows.length) {
      // ---- INICIO DEL CAMBIO 2: Crear objeto de usuario con el nombre ----
      const users = rows.map(row => ({
        name: row[0] || 'Sin Nombre', // Columna A
        email: row[1] ? row[1].toLowerCase() : '', // Columna B
        role: row[2] || 'Usuario', // Columna C
      }));
      // ---- FIN DEL CAMBIO 2 ----
      return {
        statusCode: 200,
        body: JSON.stringify(users),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify([]),
    };

  } catch (error) {
    console.error('Error al leer la hoja de usuarios:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'No se pudo conectar con la base de datos de usuarios.' }),
    };
  }
};
