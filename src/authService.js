import { supabase } from './supabaseClient'
import { getRoleFromEmail } from './authConfig'

const profileFields = 'id, username, email, role, created_at, updated_at'

export async function loadProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select(profileFields)
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

export async function upsertProfile(user, username) {
  if (!user?.id || !user?.email) {
    throw new Error('Missing authenticated user information')
  }

  const profile = {
    id: user.id,
    username: username || user.user_metadata?.username || user.email.split('@')[0],
    email: user.email,
    role: getRoleFromEmail(user.email),
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('profiles')
    .upsert(profile, { onConflict: 'id' })
    .select(profileFields)
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function signUpWithProfile({ username, email, password }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
      },
    },
  })

  if (error) {
    throw error
  }

  return {
    session: data.session,
    user: data.user,
    profile: data.user ? { username } : null,
  }
}

export async function signInWithProfile({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw error
  }

  const profile = data.user ? await upsertProfile(data.user) : null

  return {
    session: data.session,
    user: data.user,
    profile,
  }
}
