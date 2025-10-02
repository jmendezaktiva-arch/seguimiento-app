// public/js/tasks.js (VERSIÓN FINAL Y DEFINITIVA)

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

    let userMap = new Map();
    const taskListContainer = document.getElementById('task-list');
    const addTaskForm = document.getElementById('add-task-form');
    const saveResultButton = document.getElementById('save-result-button');
    const expectedResultTextarea = document.getElementById('expected-result-textarea');
    const resultStatusMessage = document.getElementById('result-status-message');
    const taskResponsibleSelect = document.getElementById('task-responsible');
    const resultResponsibleSelect = document.getElementById('result-responsible');
    const taskProjectSelect = document.getElementById('task-project');


    const loadUsersIntoDropdowns = async () => {
        try {
            const response = await fetch('/.netlify/functions/getUsers');
            const users = await response.json();
            userMap.clear();
            users.forEach(user => {
                if (user.email) userMap.set(user.email, user.name);
            });
            taskResponsibleSelect.innerHTML = '<option value="">Selecciona un responsable</option>';
            resultResponsibleSelect.innerHTML = '<option value="">Selecciona un responsable</option>';
            users.forEach(user => {
                if (user.email) {
                    const option = document.createElement('option');
                    option.value = user.email;
                    option.textContent = user.name;
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

    const loadTasks = async () => {
        try {
            const userRole = localStorage.getItem('userRole');
            const scope = userRole === 'Admin' ? 'all' : 'user';
            const response = await fetch(`/.netlify/functions/getTasks?email=${userEmail}&scope=${scope}`);
            if (!response.ok) throw new Error('La respuesta del servidor para getTasks no fue exitosa.');
            const tasks = await response.json();
            renderTasks(tasks);
        } catch (error) {
            // ---- MEJORA DE DEBUGGING: Mostramos el error real en la consola ----
            console.error('Error detallado en loadTasks:', error);
            taskListContainer.innerHTML = '<p class="text-red-500">Error al cargar las tareas.</p>';
        }
    };

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
            const groupKey = (date && !isNaN(date)) ? new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(date) : 'Sin Fecha';
            if (!acc[groupKey]) acc[groupKey] = [];
            acc[groupKey].push(task);
            return acc;
        }, {});
        for (const groupKey in groupedTasks) {
            const monthBlock = document.createElement('div');
            monthBlock.className = 'mb-4';
            monthBlock.innerHTML = `<div class="flex cursor-pointer items-center justify-between rounded-md bg-slate-200 p-3"><h3 class="font-bold capitalize text-slate-700">${groupKey}</h3><svg class="h-5 w-5 transform text-slate-500 transition-transform" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" /></svg></div><div class="tasks-sublist mt-2 hidden space-y-2 pl-4"></div>`;
            const tasksSublist = monthBlock.querySelector('.tasks-sublist');
            groupedTasks[groupKey].forEach(task => {
                const statusColor = task.status === 'Cumplida' ? 'bg-green-500' : 'bg-red-500';
                const taskElement = document.createElement('div');
                taskElement.className = 'flex items-center justify-between rounded-md border border-slate-200 p-3';
                taskElement.dataset.rowNumber = task.rowNumber;
                taskElement.dataset.status = task.status;
                const assigneeName = userMap.get(task.assignedTo) || task.assignedTo;
                taskElement.innerHTML = `<div class="flex items-center flex-grow"><span class="status-circle mr-3 h-4 w-4 flex-shrink-0 cursor-pointer rounded-full ${statusColor}" title="Cambiar estado"></span><div class="min-w-0"><p class="text-slate-800 font-medium truncate">${task.description}</p><p class="text-sm text-slate-500 truncate">${assigneeName}</p></div></div><div class="flex items-center space-x-4 flex-shrink-0 ml-4"><span class="text-sm text-slate-500">${task.dueDate || ''}</span><button title="Crear evento de calendario" class="create-event-btn text-slate-400 hover:text-blue-600" data-description="${task.description}" data-duedate="${task.dueDate}" data-duetime="${task.dueTime || ''}" data-assignee="${task.assignedTo}"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 pointer-events-none" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd" /></svg></button></div>`;
                tasksSublist.appendChild(taskElement);
            });
            taskListContainer.appendChild(monthBlock);
        }
    };

    // ... añade esta nueva función
const loadProjectsIntoDropdown = async () => {
    try {
        const response = await fetch('/.netlify/functions/projects');
        const projects = await response.json();
        taskProjectSelect.innerHTML = '<option value="">Selecciona un proyecto</option>';
        projects.forEach(project => {
            if (project.id && project.name) {
                const option = document.createElement('option');
                option.value = project.id;
                option.textContent = project.name;
                taskProjectSelect.appendChild(option);
            }
        });
    } catch (error) {
        console.error('Error al cargar proyectos:', error);
        taskProjectSelect.innerHTML = '<option value="">Error al cargar</option>';
    }
};

    addTaskForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const description = document.getElementById('task-description').value.trim();
        const dueDate = document.getElementById('task-date').value;
        const dueTime = document.getElementById('task-time').value;
        const assignedTo = taskResponsibleSelect.value;
        const projectId = taskProjectSelect.value; // Nueva línea
        const submitButton = addTaskForm.querySelector('button');
        if (!description || !dueDate) {
            alert('La descripción y la fecha son obligatorias.');
            return;
        }
        submitButton.disabled = true;
        submitButton.textContent = 'Guardando...';
        try {
            await fetch('/.netlify/functions/updateTask', {
                method: 'POST',
                body: JSON.stringify({
                    action: 'create',
                    description,
                    dueDate,
                    dueTime,
                    assignedTo: taskResponsibleSelect.value,
                    projectId // Nueva propiedad
                }),
            });
            addTaskForm.reset();
            loadTasks();
        } catch (error) {
            alert('No se pudo crear la tarea.');
            console.error('Error al crear tarea:', error);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Guardar Tarea';
        }
    });

    taskListContainer.addEventListener('click', async (event) => {
        const target = event.target;
        const header = target.closest('.flex.cursor-pointer');
        if (header && !target.classList.contains('status-circle')) {
            const sublist = header.nextElementSibling;
            const arrow = header.querySelector('svg');
            sublist.classList.toggle('hidden');
            arrow.classList.toggle('rotate-180');
            return;
        }
        if (target.classList.contains('status-circle')) {
            const taskElement = target.closest('div[data-row-number]');
            const { rowNumber, status } = taskElement.dataset;
            const newStatus = status === 'Pendiente' ? 'Cumplida' : 'Pendiente';
            try {
                await fetch('/.netlify/functions/updateTask', {
                    method: 'POST',
                    body: JSON.stringify({ action: 'updateStatus', rowNumber, newStatus }),
                });
                loadTasks();
            } catch (error) {
                alert('No se pudo actualizar la tarea.');
            }
            return;
        }
        const eventButton = target.closest('.create-event-btn');
        if (eventButton) {
            const { description, duedate, duetime, assignee } = eventButton.dataset;
            const organizerEmail = localStorage.getItem('userEmail');
            if (!duedate) {
                alert('Esta tarea no tiene una fecha para crear un evento.');
                return;
            }
            const originalButtonContent = eventButton.innerHTML;
            eventButton.innerHTML = `<svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>`;
            eventButton.disabled = true;
            try {
                const response = await fetch('/.netlify/functions/createCalendarEvent', {
                    method: 'POST',
                    body: JSON.stringify({
                        summary: description,
                        dueDate: duedate,
                        dueTime: duetime,
                        attendeeEmail: assignee,
                        organizerEmail: organizerEmail,
                    }),
                });
                if (!response.ok) throw new Error(await response.text());
                alert(`Invitación enviada a ${assignee}.`);
            } catch (error) {
                console.error('Error al enviar la invitación:', error);
                alert('No se pudo enviar la invitación. Revisa la consola para más detalles.');
            } finally {
                eventButton.innerHTML = originalButtonContent;
                eventButton.disabled = false;
            }
        }
    });
    
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
        try {
            await fetch('/.netlify/functions/updateResultados', {
                method: 'POST',
                body: JSON.stringify({
                    action: 'saveResult',
                    weekId,
                    userEmail: resultResponsibleSelect.value,
                    expectedResult,
                }),
            });
            resultStatusMessage.textContent = '¡Resultado guardado con éxito!';
            resultStatusMessage.className = 'mt-2 text-sm text-green-600';
        } catch (error) {
            resultStatusMessage.textContent = 'No se pudo guardar el resultado.';
            resultStatusMessage.className = 'mt-2 text-sm text-red-600';
        } finally {
            saveResultButton.disabled = false;
            saveResultButton.textContent = 'Guardar Resultado';
            setTimeout(() => { resultStatusMessage.textContent = ''; }, 3000);
        }
    });

    // ---- INICIO DE LA CORRECCIÓN DE LA CONDICIÓN DE CARRERA ----
    // Esta función se asegura de que los usuarios se carguen ANTES de que se pidan las tareas.
    const initializePage = async () => {
        await loadUsersIntoDropdowns();
        await loadProjectsIntoDropdown(); // Nueva línea
        await loadTasks();
    };

    initializePage();
    // ---- FIN DE LA CORRECCIÓN ----
});