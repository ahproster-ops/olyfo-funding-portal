import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

window.handleLogin = async (event) => {
  event.preventDefault()
  const email = document.getElementById('email').value
  const password = document.getElementById('password').value
  const errorDiv = document.getElementById('error')
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) throw error
    
    document.getElementById('login-form').style.display = 'none'
    document.getElementById('dashboard').style.display = 'block'
  } catch (error) {
    errorDiv.textContent = error.message
  }
}

window.handleLogout = async () => {
  await supabase.auth.signOut()
  document.getElementById('login-form').style.display = 'block'
  document.getElementById('dashboard').style.display = 'none'
  document.getElementById('email').value = ''
  document.getElementById('password').value = ''
  document.getElementById('error').textContent = ''
}

supabase.auth.onAuthStateChange((event, session) => {
  if (session) {
    document.getElementById('login-form').style.display = 'none'
    document.getElementById('dashboard').style.display = 'block'
  } else {
    document.getElementById('login-form').style.display = 'block'
    document.getElementById('dashboard').style.display = 'none'
  }
})
