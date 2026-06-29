export const ADMIN_EMAIL = 'vamsiallam77@gmail.com'

export const getRoleFromEmail = (email) =>
  email?.toLowerCase() === ADMIN_EMAIL ? 'admin' : 'user'
