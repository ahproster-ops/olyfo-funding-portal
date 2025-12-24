import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

let currentUser = null
let operationsChart = null

// Login Handler
window.handleLogin = async (event) => {
    event.preventDefault()
    const email = document.getElementById('login-email').value
    const password = document.getElementById('login-password').value

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        })

        if (error) throw error

        currentUser = data.user
        document.getElementById('login-screen').style.display = 'none'
        document.getElementById('app').classList.remove('hidden')
        loadDashboard()
    } catch (error) {
        alert('Login failed: ' + error.message)
    }
}

// Logout Handler
window.handleLogout = async () => {
    await supabase.auth.signOut()
    document.getElementById('login-screen').style.display = 'flex'
    document.getElementById('app').classList.add('hidden')
}

// Show Section
window.showSection = (section) => {
    const sections = ['dashboard', 'calculator', 'operations', 'tasks', 'documents', 'admin']
    sections.forEach(s => {
        document.getElementById(s).classList.add('hidden')
    })
    document.getElementById(section).classList.remove('hidden')

    if (section === 'dashboard') loadDashboard()
    else if (section === 'operations') loadOperations()
    else if (section === 'tasks') loadTasks()
    else if (section === 'documents') loadDocuments()
    else if (section === 'admin') loadAdmin()
}

// Load Dashboard
async function loadDashboard() {
    try {
        const { data: operations } = await supabase.from('operations').select('*')
        const { data: tasks } = await supabase.from('tasks').select('*')
        const { data: documents } = await supabase.from('documents').select('*')

        document.getElementById('total-operations').textContent = operations?.length || 0
        const totalAmount = operations?.reduce((sum, op) => sum + (parseFloat(op.amount) || 0), 0) || 0
        document.getElementById('total-amount').textContent = '$' + totalAmount.toLocaleString()
        document.getElementById('pending-tasks').textContent = tasks?.filter(t => t.status === 'pending')?.length || 0
        document.getElementById('total-documents').textContent = documents?.length || 0

        // Chart
        if (operationsChart) operationsChart.destroy()
        const ctx = document.getElementById('operationsChart')
        operationsChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Operations',
                    data: [12, 19, 3, 5, 2, 3],
                    borderColor: 'rgb(37, 99, 235)',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)'
                }]
            }
        })
    } catch (error) {
        console.error('Dashboard error:', error)
    }
}

// Calculator
window.calculateFunding = () => {
    const amount = parseFloat(document.getElementById('calc-amount').value)
    const rate = parseFloat(document.getElementById('calc-rate').value) / 100
    const fee = parseFloat(document.getElementById('calc-fee').value) / 100

    const advance = amount * rate
    const feeAmount = amount * fee
    const reserve = amount - advance
    const net = advance - feeAmount

    document.getElementById('result-advance').textContent = advance.toFixed(2)
    document.getElementById('result-fee').textContent = feeAmount.toFixed(2)
    document.getElementById('result-reserve').textContent = reserve.toFixed(2)
    document.getElementById('result-net').textContent = net.toFixed(2)
    document.getElementById('calc-results').classList.remove('hidden')
}

// Load Operations
async function loadOperations() {
    try {
        const { data: operations } = await supabase.from('operations').select('*').order('created_at', { ascending: false })
        const tbody = document.getElementById('operations-list')
        tbody.innerHTML = ''

        operations?.forEach(op => {
            const row = document.createElement('tr')
            row.innerHTML = `
                <td class="p-3">${new Date(op.date).toLocaleDateString()}</td>
                <td class="p-3">${op.type}</td>
                <td class="p-3">${op.client}</td>
                <td class="p-3">$${parseFloat(op.amount).toLocaleString()}</td>
                <td class="p-3"><span class="px-2 py-1 rounded bg-green-100 text-green-800">${op.status}</span></td>
                <td class="p-3">
                    <button onclick="deleteOperation(${op.id})" class="text-red-600">Delete</button>
                </td>
            `
            tbody.appendChild(row)
        })
    } catch (error) {
        console.error('Operations error:', error)
    }
}

window.showAddOperation = () => {
    document.getElementById('modal-title').textContent = 'Add Operation'
    document.getElementById('modal-content').innerHTML = `
        <div class="space-y-4">
            <input type="date" id="op-date" class="w-full p-2 border rounded">
            <input type="text" id="op-type" placeholder="Type" class="w-full p-2 border rounded">
            <input type="text" id="op-client" placeholder="Client" class="w-full p-2 border rounded">
            <input type="number" id="op-amount" placeholder="Amount" class="w-full p-2 border rounded">
            <input type="text" id="op-status" placeholder="Status" class="w-full p-2 border rounded">
        </div>
    `
    document.getElementById('modal').classList.remove('hidden')
    document.getElementById('modal').classList.add('flex')
}

window.saveModal = async () => {
    const date = document.getElementById('op-date')?.value
    if (date) {
        await supabase.from('operations').insert({
            date,
            type: document.getElementById('op-type').value,
            client: document.getElementById('op-client').value,
            amount: document.getElementById('op-amount').value,
            status: document.getElementById('op-status').value,
            user_id: currentUser.id
        })
        closeModal()
        loadOperations()
    }
}

window.closeModal = () => {
    document.getElementById('modal').classList.add('hidden')
    document.getElementById('modal').classList.remove('flex')
}

window.deleteOperation = async (id) => {
    if (confirm('Delete this operation?')) {
        await supabase.from('operations').delete().eq('id', id)
        loadOperations()
    }
}

// Load Tasks
async function loadTasks() {
    try {
        const { data: tasks } = await supabase.from('tasks').select('*').order('created_at', { ascending: false })
        const container = document.getElementById('tasks-list')
        container.innerHTML = ''

        tasks?.forEach(task => {
            const div = document.createElement('div')
            div.className = 'bg-white p-4 rounded-lg shadow'
            div.innerHTML = `
                <h3 class="font-bold">${task.title}</h3>
                <p class="text-gray-600">${task.description}</p>
                <p class="text-sm text-gray-500">Due: ${new Date(task.due_date).toLocaleDateString()}</p>
                <span class="px-2 py-1 rounded bg-blue-100 text-blue-800 text-sm">${task.status}</span>
                <button onclick="deleteTask(${task.id})" class="text-red-600 ml-4">Delete</button>
            `
            container.appendChild(div)
        })
    } catch (error) {
        console.error('Tasks error:', error)
    }
}

window.showAddTask = () => {
    document.getElementById('modal-title').textContent = 'Add Task'
    document.getElementById('modal-content').innerHTML = `
        <div class="space-y-4">
            <input type="text" id="task-title" placeholder="Title" class="w-full p-2 border rounded">
            <textarea id="task-desc" placeholder="Description" class="w-full p-2 border rounded"></textarea>
            <input type="date" id="task-due" class="w-full p-2 border rounded">
            <input type="text" id="task-status" placeholder="Status" value="pending" class="w-full p-2 border rounded">
        </div>
    `
    document.getElementById('modal').classList.remove('hidden')
    document.getElementById('modal').classList.add('flex')
}

window.saveModal = async () => {
    const title = document.getElementById('task-title')?.value
    if (title) {
        await supabase.from('tasks').insert({
            title,
            description: document.getElementById('task-desc').value,
            due_date: document.getElementById('task-due').value,
            status: document.getElementById('task-status').value,
            user_id: currentUser.id
        })
        closeModal()
        loadTasks()
    }
}

window.deleteTask = async (id) => {
    if (confirm('Delete this task?')) {
        await supabase.from('tasks').delete().eq('id', id)
        loadTasks()
    }
}

// Load Documents
async function loadDocuments() {
    try {
        const { data: documents } = await supabase.from('documents').select('*').order('created_at', { ascending: false })
        const container = document.getElementById('documents-list')
        container.innerHTML = ''

        documents?.forEach(doc => {
            const div = document.createElement('div')
            div.className = 'bg-white p-4 rounded-lg shadow'
            div.innerHTML = `
                <h3 class="font-bold">${doc.name}</h3>
                <p class="text-sm text-gray-500">${doc.type}</p>
                <p class="text-sm text-gray-500">Uploaded: ${new Date(doc.uploaded_date).toLocaleDateString()}</p>
                <button onclick="deleteDocument(${doc.id})" class="text-red-600 mt-2">Delete</button>
            `
            container.appendChild(div)
        })
    } catch (error) {
        console.error('Documents error:', error)
    }
}

window.showAddDocument = () => {
    document.getElementById('modal-title').textContent = 'Upload Document'
    document.getElementById('modal-content').innerHTML = `
        <div class="space-y-4">
            <input type="text" id="doc-name" placeholder="Document Name" class="w-full p-2 border rounded">
            <input type="text" id="doc-type" placeholder="Type" class="w-full p-2 border rounded">
            <input type="text" id="doc-url" placeholder="File URL" class="w-full p-2 border rounded">
            <input type="date" id="doc-date" class="w-full p-2 border rounded">
        </div>
    `
    document.getElementById('modal').classList.remove('hidden')
    document.getElementById('modal').classList.add('flex')
}

window.saveModal = async () => {
    const name = document.getElementById('doc-name')?.value
    if (name) {
        await supabase.from('documents').insert({
            name,
            type: document.getElementById('doc-type').value,
            file_url: document.getElementById('doc-url').value,
            uploaded_date: document.getElementById('doc-date').value,
            user_id: currentUser.id
        })
        closeModal()
        loadDocuments()
    }
}

window.deleteDocument = async (id) => {
    if (confirm('Delete this document?')) {
        await supabase.from('documents').delete().eq('id', id)
        loadDocuments()
    }
}

// Load Admin
async function loadAdmin() {
    try {
        const { data: operations } = await supabase.from('operations').select('*')
        const { data: tasks } = await supabase.from('tasks').select('*')
        const { data: documents } = await supabase.from('documents').select('*')

        document.getElementById('admin-operations').textContent = operations?.length || 0
        document.getElementById('admin-tasks').textContent = tasks?.length || 0
        document.getElementById('admin-documents').textContent = documents?.length || 0
    } catch (error) {
        console.error('Admin error:', error)
    }
}

// Check auth on load
supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
        currentUser = session.user
        document.getElementById('login-screen').style.display = 'none'
        document.getElementById('app').classList.remove('hidden')
        loadDashboard()
    }
})
