// netlify/functions/comments.js

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
const sheetName = 'Comentarios';

exports.handler = async (event) => {
  // ---- ACCIÓN PARA OBTENER COMENTARIOS DE UNA TAREA ----
  if (event.httpMethod === 'GET') {
    const taskId = event.queryStringParameters.taskId;
    if (!taskId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'El ID de la tarea es requerido.' }) };
    }
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A:E`,
      });
      const allComments = (response.data.values || []).slice(1).map(row => ({
        commentId: row[0],
        taskId: row[1],
        userEmail: row[2],
        timestamp: row[3],
        text: row[4],
      }));
      const taskComments = allComments.filter(c => c.taskId === taskId);
      return { statusCode: 200, body: JSON.stringify(taskComments) };
    } catch (error) {
      return { statusCode: 500, body: JSON.stringify({ error: 'No se pudieron obtener los comentarios.' }) };
    }
  }

  // ---- ACCIÓN PARA AÑADIR UN NUEVO COMENTARIO ----
  if (event.httpMethod === 'POST') {
    const { taskId, userEmail, commentText } = JSON.parse(event.body);
    if (!taskId || !userEmail || !commentText) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Faltan datos para añadir el comentario.' }) };
    }
    try {
      const newRow = [
        Date.now().toString(), // CommentID
        taskId,
        userEmail,
        new Date().toISOString(), // Timestamp
        commentText,
      ];
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A:E`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: [newRow] },
      });
      return { statusCode: 201, body: JSON.stringify({ message: 'Comentario añadido' }) };
    } catch (error) {
      return { statusCode: 500, body: JSON.stringify({ error: 'No se pudo guardar el comentario.' }) };
    }
  }
  
  return { statusCode: 405, body: 'Method Not Allowed' };
};