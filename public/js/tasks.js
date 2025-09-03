// public/js/tasks.js (VERSIÓN FINAL CORREGIDA)

const getCurrentWeekId = () => {
    const date = new Date();
    const year = date.getFullYear();
    const firstDayOfYear = new Date(year, 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    return `${year}-W${String(weekNumber).padStart(2, '0')}`;
};

const parseDate = (dateString) => {
    if (!dateString) return null;
    let parts = dateString.split(/[-/]/);
    if (parts.length < 3) return null;
    if (parts[0].length === 4) return new Date(parts[0], parts[1] - 1, parts[2]);
    if (parts[2].length === 4) return new Date(parts[2], parts[1] - 1, parts[0]);
    return new Date(dateString);
};

document.addEventListener('DOMContentLoaded', () => {
    const userEmail = localStorage.getItem('userEmail');
    if (!userEmail) {
        window.location.href = '/index.html';
        return;
    }

    // --- Elementos del DOM ---
    const taskListContainer = document.getElementById('task-list');
    const addTaskForm = document.getElementById('add-task-form');
    const saveResultButton = document.getElementById('save-result-button');
    const expectedResultTextarea = document.getElementById('expected-result-textarea');
    const resultStatusMessage = document.getElementById('result-status-message');
    // ---- INICIO DEL CAMBIO ----
    const taskResponsibleSelect = document.getElementById('task-responsible');
    const resultResponsibleSelect = document.getElementById('result-responsible');
// ---- FIN DEL CAMBIO ----

// ---- INICIO DEL CAMBIO ----
const loadUsersIntoDropdowns = async () => {
    try {
        const response = await fetch('/.netlify/functions/getUsers');
        const users = await response.json();

        taskResponsibleSelect.innerHTML = '<option value="">Selecciona un responsable</option>';
        resultResponsibleSelect.innerHTML = '<option value="">Selecciona un responsable</option>';

        users.forEach(user => {
            if (user.email) {
                const option = document.createElement('option');
                option.value = user.email;
                option.textContent = user.email;
                taskResponsibleSelect.appendChild(option.cloneNode(true));
                resultResponsibleSelect.appendChild(option);
            }
        });
    } catch (error) {
        console.error('Error al cargar usuarios:', error);
        taskResponsibleSelect.innerHTML = '<option value="">Error al cargar</option>';
        resultResponsibleSelect.innerHTML = '<option value="">Error al cargar</option>';
    }
};
// ---- FIN DEL CAMBIO ----

// ---- INICIO DEL CAMBIO ----
loadUsersIntoDropdowns();
loadTasks(); // <-- Esta línea es la que falta y es crucial.
// ---- FIN DEL CAMBIO ----

    // ===============================================================
    //                  LÓGICA DE RESULTADOS
    // ===============================================================
    
    saveResultButton.addEventListener('click', async () => {
        const weekId = getCurrentWeekId();
        const expectedResult = expectedResultTextarea.value.trim();
        if (!expectedResult) {
            resultStatusMessage.textContent = 'Por favor, escribe un resultado.';
            resultStatusMessage.className = 'mt-2 text-sm text-red-600';
            return;
        }

        saveResultButton.disabled = true;
        saveResultButton.textContent = 'Guardando...';
        resultStatusMessage.textContent = '';

        try {
            await fetch('/.netlify/functions/updateResultados', {
                method: 'POST',
                body: JSON.stringify({
                    action: 'saveResult',
                    weekId,
                     userEmail: resultResponsibleSelect.value, // Obtiene el email del <select>
                    expectedResult,
                }),
            });
            expectedResultTextarea.value = '';
            resultStatusMessage.textContent = '¡Resultado guardado con éxito!';
            resultStatusMessage.className = 'mt-2 text-sm text-green-600';
        } catch (error) {
            console.error('Error al guardar:', error);
            resultStatusMessage.textContent = 'No se pudo guardar el resultado.';
            resultStatusMessage.className = 'mt-2 text-sm text-red-600';
        } finally {
            saveResultButton.disabled = false;
            saveResultButton.textContent = 'Guardar Resultado';
            setTimeout(() => { resultStatusMessage.textContent = ''; }, 3000);
        }
    });

    // ===============================================================
    //                  LÓGICA DE TAREAS
    // ===============================================================
    
    const renderTasks = (tasks) => {
        taskListContainer.innerHTML = '';
        if (tasks.length === 0) {
            taskListContainer.innerHTML = '<p class="text-slate-500">No tienes tareas asignadas.</p>';
            return;
        }
        tasks.sort((a, b) => {
            const dateA = parseDate(a.dueDate);
            const dateB = parseDate(b.dueDate);
            if (!dateA) return 1;
            if (!dateB) return -1;
            return dateA - dateB;
        });
        const groupedTasks = tasks.reduce((acc, task) => {
            const date = parseDate(task.dueDate);
            const groupKey = (date && !isNaN(date))
                ? new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(date)
                : 'Sin Fecha';
            if (!acc[groupKey]) acc[groupKey] = [];
            acc[groupKey].push(task);
            return acc;
        }, {});
        for (const groupKey in groupedTasks) {
            const monthBlock = document.createElement('div');
            monthBlock.className = 'mb-4';
            monthBlock.innerHTML = `
                <div class="flex cursor-pointer items-center justify-between rounded-md bg-slate-200 p-3">
                    <h3 class="font-bold capitalize text-slate-700">${groupKey}</h3>
                    <svg class="h-5 w-5 transform text-slate-500 transition-transform" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
                </div>
                <div class="tasks-sublist mt-2 hidden space-y-2 pl-4"></div>
            `;
            const tasksSublist = monthBlock.querySelector('.tasks-sublist');
            
            // ---- AQUÍ ESTÁ LA CORRECCIÓN ----
            // Se usa 'groupedTasks[groupKey]' en lugar de la variable inexistente 'monthTasks'.
            groupedTasks[groupKey].forEach(task => {
                const statusColor = task.status === 'Cumplida' ? 'bg-green-500' : 'bg-red-500';
                const taskElement = document.createElement('div');
                taskElement.className = 'flex items-center justify-between rounded-md border border-slate-200 p-3';
                taskElement.dataset.rowNumber = task.rowNumber;
                taskElement.dataset.status = task.status;
                taskElement.innerHTML = `
                    <div class="flex items-center">
                        <span class="status-circle mr-3 h-4 w-4 flex-shrink-0 cursor-pointer rounded-full ${statusColor}" title="Cambiar estado"></span>
                        <p class="text-slate-700">${task.description}</p>
                    </div>
                    <div class="text-sm text-slate-500">${task.dueDate || ''}</div>
                `;
                tasksSublist.appendChild(taskElement);
            });
            taskListContainer.appendChild(monthBlock);
        }
    };
    
    taskListContainer.addEventListener('click', (event) => {
        const header = event.target.closest('.flex.cursor-pointer');
        if (header && !event.target.classList.contains('status-circle')) {
            const sublist = header.nextElementSibling;
            const arrow = header.querySelector('svg');
            sublist.classList.toggle('hidden');
            arrow.classList.toggle('rotate-180');
        }
    });

    const loadTasks = async () => {
        try {
            const response = await fetch(`/.netlify/functions/getTasks?email=${userEmail}`);
            if (!response.ok) throw new Error('No se pudieron cargar las tareas.');
            const tasks = await response.json();
            renderTasks(tasks);
        } catch (error) {
            console.error(error);
            taskListContainer.innerHTML = '<p class="text-red-500">Error al cargar las tareas.</p>';
        }
    };

    addTaskForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const descriptionInput = document.getElementById('task-description');
        const dateInput = document.getElementById('task-date');
        const submitButton = addTaskForm.querySelector('button');
        const description = descriptionInput.value.trim();
        const dueDate = dateInput.value;
        if (!description || !dueDate) {
            alert('Por favor, completa todos los campos.');
            return;
        }
        submitButton.disabled = true;
        submitButton.textContent = 'Guardando...';
        try {
            await fetch('/.netlify/functions/updateTask', {
                method: 'POST',
                body: JSON.stringify({ action: 'create', description, dueDate, assignedTo: taskResponsibleSelect.value }),
            });
            descriptionInput.value = '';
            dateInput.value = '';
            loadTasks();
        } catch (error) {
            console.error('Error al crear la tarea:', error);
            alert('No se pudo crear la tarea.');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Guardar Tarea';
        }
    });

    taskListContainer.addEventListener('click', async (event) => {
        if (event.target.classList.contains('status-circle')) {
            const taskElement = event.target.closest('div[data-row-number]');
            if (!taskElement) return;
            const rowNumber = taskElement.dataset.rowNumber;
            const currentStatus = taskElement.dataset.status;
            const newStatus = currentStatus === 'Pendiente' ? 'Cumplida' : 'Pendiente';
            try {
                await fetch('/.netlify/functions/updateTask', {
                    method: 'POST',
                    body: JSON.stringify({ action: 'updateStatus', rowNumber, newStatus }),
                });
                loadTasks();
            } catch (error) {
                console.error('Error al actualizar el estado:', error);
                alert('No se pudo actualizar la tarea.');
            }
        }
    });
    
    loadTasks();
});