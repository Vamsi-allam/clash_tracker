import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import AdminPage from './pages/AdminPage'
import UserPage from './pages/UserPage'
import BuildingEditorPage from './pages/BuildingEditorPage'
import { supabase } from './supabaseClient'
import { getRoleFromEmail } from './authConfig'
import { loadProfile, signInWithProfile, signUpWithProfile, upsertProfile } from './authService'

const authView = 'login'

function resolveRole(user, profile) {
	if (profile?.role) {
		return profile.role
	}

	return getRoleFromEmail(user?.email)
}

export default function App() {
	const [view, setView] = useState(authView)
	const [loading, setLoading] = useState(true)
	const [actionLoading, setActionLoading] = useState(false)
	const [errorMessage, setErrorMessage] = useState('')
	const [infoMessage, setInfoMessage] = useState('')
	const [session, setSession] = useState(null)
	const [profile, setProfile] = useState(null)

	useEffect(() => {
		let isMounted = true

		const syncSession = async (currentSession) => {
			const user = currentSession?.user ?? null

			if (!user) {
				if (isMounted) {
					setSession(null)
					setProfile(null)
					setView(authView)
					setLoading(false)
				}

				return
			}

			try {
				const existingProfile = await loadProfile(user.id)
				const nextProfile = existingProfile ?? (await upsertProfile(user))

				if (isMounted) {
					setSession(currentSession)
					setProfile(nextProfile)
					setView(resolveRole(user, nextProfile))
					setLoading(false)
				}
			} catch {
				const fallbackProfile = await upsertProfile(user)

				if (isMounted) {
					setSession(currentSession)
					setProfile(fallbackProfile)
					setView(resolveRole(user, fallbackProfile))
					setLoading(false)
				}
			}
		}

		supabase.auth.getSession().then(({ data }) => {
			void syncSession(data.session)
		})

		const { data: listener } = supabase.auth.onAuthStateChange((_event, currentSession) => {
			void syncSession(currentSession)
		})

		return () => {
			isMounted = false
			listener.subscription.unsubscribe()
		}
	}, [])

	const clearFeedback = () => {
		setErrorMessage('')
		setInfoMessage('')
	}

	const handleLogin = async ({ email, password }) => {
		clearFeedback()
		setActionLoading(true)

		try {
			const result = await signInWithProfile({ email, password })
			setSession(result.session)
			setProfile(result.profile)
			setView(resolveRole(result.user, result.profile))
		} catch (error) {
			setErrorMessage(error?.message || 'Could not sign in.')
		} finally {
			setActionLoading(false)
		}
	}

	const handleRegister = async ({ username, email, password }) => {
		clearFeedback()
		setActionLoading(true)

		try {
			const result = await signUpWithProfile({ username, email, password })

			if (result.session) {
				setSession(result.session)
				const fetchedProfile = result.user ? await loadProfile(result.user.id) : null
				const nextProfile = fetchedProfile ?? result.profile
				setProfile(nextProfile)
				setView(resolveRole(result.user, nextProfile))
				return
			}

			setView(authView)
			setInfoMessage('Account created. If email verification is enabled in Supabase, confirm the email first.')
		} catch (error) {
			setErrorMessage(error?.message || 'Could not create the account.')
		} finally {
			setActionLoading(false)
		}
	}

	const handleLogout = async () => {
		await supabase.auth.signOut()
		setSession(null)
		setProfile(null)
		setView(authView)
	}

	if (loading) {
		return (
			<div className="loading-screen">
				<div className="loading-card glass-panel">
					<div className="loading-ring" />
					<p>Preparing your Supabase session...</p>
				</div>
			</div>
		)
	}

	if (!session) {
		return (
			<Routes>
				<Route
					path="/register"
					element={
						<RegisterPage
							onRegister={handleRegister}
							onSwitchToLogin={() => setView('login')}
							loading={actionLoading}
							errorMessage={errorMessage}
							infoMessage={infoMessage}
						/>
					}
				/>
				<Route
					path="*"
					element={
						<LoginPage
							onLogin={handleLogin}
							onSwitchToRegister={() => setView('register')}
							loading={actionLoading}
							errorMessage={errorMessage}
						/>
					}
				/>
			</Routes>
		)
	}

	return (
		<Routes>
			{view === 'admin' && (
				<>
					<Route
						path="/admin"
						element={
							<AdminPage username={profile?.username} onLogout={handleLogout} userId={session?.user?.id} />
						}
					/>
					<Route
						path="/admin/building/:townhallLevel/:buildingId"
						element={<BuildingEditorPage username={profile?.username} onLogout={handleLogout} />}
					/>
					<Route path="*" element={<Navigate to="/admin" />} />
				</>
			)}
			{view === 'user' && (
				<>
					<Route
						path="/user"
						element={
							<UserPage username={profile?.username} onLogout={handleLogout} userId={session?.user?.id} />
						}
					/>
					<Route path="*" element={<Navigate to="/user" />} />
				</>
			)}
		</Routes>
	)
}
