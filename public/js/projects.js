// public/js/projects.js

document.addEventListener('DOMContentLoaded', () => {
    // --- INICIALIZACIÓN Y SELECTORES ---
    const userEmail = localStorage.getItem('userEmail');
    if (!userEmail) { window.location.href = '/index.html'; return; }

    const projectSelector = document.getElementById('project-selector');
    const kanbanBoard = document.getElementById('kanban-board');
    let userMap = new Map();
    let currentTasks = [];
    
    // --- LÓGICA DEL MODAL ---
    const modal = document.getElementById('task-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const modalCommentForm = document.getElementById('modal-comment-form');
    let activeTaskId = null;

    modalCloseBtn.addEventListener('click', () => modal.style.display = 'none');
    
    // --- CARGA DE DATOS ---
    const loadUsers = async () => { /* ... (copia la función de tasks.js) ... */ };
    
    const loadProjects = async () => {
        const response = await fetch('/.netlify/functions/projects');
        const projects = await response.json();
        projectSelector.innerHTML = '<option value="">Selecciona un proyecto</option>';
        projects.forEach(p => projectSelector.innerHTML += `<option value="${p.id}">${p.name}</option>`);
    };

    const loadTasksForProject = async (projectId) => {
        if (!projectId) { kanbanBoard.querySelectorAll('.space-y-3').forEach(c => c.innerHTML = ''); return; }
        const response = await fetch(`/.netlify/functions/getTasks?projectId=${projectId}&scope=all`);
        currentTasks = await response.json();
        renderKanbanBoard(currentTasks);
    };

    // --- RENDERIZADO DEL TABLERO ---
    const renderKanbanBoard = (tasks) => {
        kanbanBoard.querySelectorAll('.space-y-3').forEach(c => c.innerHTML = '');
        tasks.forEach(task => {
            const assigneeName = userMap.get(task.assignedTo) || task.assignedTo;
            const taskCard = document.createElement('div');
            taskCard.className = 'task-card bg-slate-50 p-3 rounded-md border';
            taskCard.draggable = true;
            taskCard.dataset.taskId = task.id;
            taskCard.innerHTML = `
                <p class="font-medium">${task.description}</p>
                <p class="text-sm text-slate-500">${assigneeName} - ${task.dueDate}</p>
            `;
            const statusKey = (task.status || 'Pendiente').toLowerCase().replace(' ', '-');
            const column = document.querySelector(`#col-${statusKey.normalize("NFD").replace(/[\u0300-\u036f]/g, "")} .space-y-3`);
            if (column) column.appendChild(taskCard);
        });
    };
    
    // --- LÓGICA DEL MODAL (CONTINUACIÓN) ---
    const openTaskModal = async (taskId) => {
        activeTaskId = taskId;
        const task = currentTasks.find(t => t.id === taskId);
        // ... (llena los campos del modal con los datos de la tarea)
        
        // Cargar comentarios
        const commentsList = document.getElementById('modal-comments-list');
        commentsList.innerHTML = 'Cargando...';
        const response = await fetch(`/.netlify/functions/comments?taskId=${taskId}`);
        const comments = await response.json();
        commentsList.innerHTML = comments.map(c => `<div class="bg-slate-100 p-2 rounded"><strong>${userMap.get(c.userEmail) || c.userEmail}:</strong> ${c.text}</div>`).join('');
        
        modal.style.display = 'flex';
    };

    modalCommentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = document.getElementById('modal-comment-text').value;
        await fetch('/.netlify/functions/comments', {
            method: 'POST',
            body: JSON.stringify({ taskId: activeTaskId, userEmail, commentText: text }),
        });
        document.getElementById('modal-comment-text').value = '';
        openTaskModal(activeTaskId); // Recarga los comentarios
    });

    // --- EVENTOS ---
        // --- INICIO: AÑADIR ESTE EVENT LISTENER ---
    createProjectForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const projectNameInput = document.getElementById('project-name');
        const projectName = projectNameInput.value.trim();
        if (!projectName) return;

        try {
            await fetch('/.netlify/functions/projects', {
                method: 'POST',
                body: JSON.stringify({
                    action: 'createProject',
                    projectName: projectName
                })
            });
            projectNameInput.value = ''; // Limpiar el input
            await loadProjects(); // Recargar la lista de proyectos en el selector
            alert('¡Proyecto creado con éxito!');
        } catch (error) {
            console.error('Error al crear proyecto:', error);
            alert('No se pudo crear el proyecto.');
        }
    });
    // --- FIN: AÑADIR ESTE EVENT LISTENER ---
    
    projectSelector.addEventListener('change', () => loadTasksForProject(projectSelector.value));
    kanbanBoard.addEventListener('click', (e) => {
        const card = e.target.closest('.task-card');
        if (card) openTaskModal(card.dataset.taskId);
    });

    // --- INICIALIZACIÓN DE LA PÁGINA ---
    const initializePage = async () => {
        await loadUsers();
        await loadProjects();
    };
    initializePage();
});