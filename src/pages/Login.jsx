import { useLoginMutation } from '@/store/api'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

export default function Login() {
	const navigate = useNavigate()
	const [gologin, { isLoading }] = useLoginMutation()
	const [gmail, setGmail] = useState('')
	const [password, setPassword] = useState('')
	const [remember, setRemember] = useState(false)
	const [showPass, setShowPass] = useState(false)
	const [errors, setErrors] = useState({})

	const validate = () => {
		const errs = {}
		if (!/^[^\s@]+@gmail\.com$/i.test(gmail.trim()))
			errs.gmail = "To'g'ri Gmail manzil kiriting"
		if (password.length < 6)
			errs.password = "Parol kamida 6 ta belgidan iborat bo'lishi kerak"
		return errs
	}

	const handleLogin = async () => {
		const errs = validate()
		setErrors(errs)
		if (Object.keys(errs).length > 0) return

		try {
			const res = await gologin({
				email: gmail.trim(),
				password,
			}).unwrap()
			toast.success('Muvaffaqiyatli kirdingiz!')
			localStorage.setItem('token', res.token)
			localStorage.setItem('email', res.user.email)
			const resolvedUserId = res?.user?._id || res?.user?.id || ''
			if (resolvedUserId) {
				localStorage.setItem('userId', String(resolvedUserId))
			} else {
				localStorage.removeItem('userId')
			}
			localStorage.setItem('isAdmin', res.user.isAdmin)
			navigate('/')
			setGmail('')
			setPassword('')
		} catch (error) {
			// Backend qaytargan xabarni ushlash
			const msg =
				error?.data?.message ||
				error?.data?.error ||
				error?.message ||
				"Kirishda xatolik yuz berdi. Iltimos, ma'lumotlarni tekshiring."
			toast.error(msg)
		}
	}

	const handleKeyDown = e => {
		if (e.key === 'Enter' && !isLoading) handleLogin()
	}
	//islomanvarov05@gmail.com

	return (
		<>
			<style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { height: 100%; width: 100%; }

        .app-shell {
          min-height: 100vh;
          min-height: 100dvh;
          width: 100%;
          background: #f0f2f5;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'DM Sans', sans-serif;
          padding: 1rem;
        }

        @media (max-width: 480px) {
          .app-shell {
            padding: 0;
            align-items: stretch;
            background: #ffffff;
          }
        }

        .login-card {
          width: 100%;
          max-width: 420px;
          background: #ffffff;
          border-radius: 24px;
          padding: 2.5rem 1.75rem 2rem;
          box-shadow: 0 4px 40px rgba(0,0,0,0.08);
        }

        @media (max-width: 480px) {
          .login-card {
            max-width: 100%;
            border-radius: 0;
            box-shadow: none;
            padding: 3.5rem 1.5rem 2rem;
            display: flex;
            flex-direction: column;
            min-height: 100dvh;
          }
        }

        .header { text-align: center; margin-bottom: 2rem; }

        .logo-ring {
          width: 64px; height: 64px;
          border-radius: 18px;
          background: #f0f4ff;
          border: 1.5px solid #dce4ff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1rem;
        }

        .header-title {
          font-size: 22px; font-weight: 600;
          color: #0d0d0d; letter-spacing: -0.3px;
        }
        .header-sub { font-size: 13.5px; color: #9098a3; margin-top: 4px; }

        .divider { height: 1px; background: #f0f2f5; margin: 0 0 1.75rem; }

        .field-group { margin-bottom: 1rem; }

        .field-label {
          display: block;
          font-size: 12px; font-weight: 600;
          color: #9098a3;
          text-transform: uppercase; letter-spacing: 0.7px;
          margin-bottom: 7px;
        }

        .field-input {
          width: 100%;
          padding: 13px 14px;
          font-size: 15px;
          font-family: 'DM Sans', sans-serif;
          background: #f7f8fa;
          border: 1.5px solid #eaecef;
          border-radius: 12px;
          color: #0d0d0d;
          outline: none;
          transition: border-color 0.18s, background 0.18s, opacity 0.15s;
          -webkit-appearance: none;
        }
        .field-input::placeholder { color: #b8bfc8; }
        .field-input:focus { border-color: #3b5bfc; background: #f5f7ff; }
        .field-input.error { border-color: #f03e3e; background: #fff5f5; }
        .field-input:disabled { opacity: 0.55; cursor: not-allowed; }

        .pass-wrap { position: relative; }
        .pass-wrap .field-input { padding-right: 46px; }

        .toggle-btn {
          position: absolute; right: 12px; top: 50%;
          transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          color: #b0b8c4; padding: 4px;
          display: flex; align-items: center;
          -webkit-tap-highlight-color: transparent;
          transition: color 0.15s;
        }
        .toggle-btn:hover { color: #3b5bfc; }

        .err-text {
          font-size: 12px; color: #f03e3e;
          margin-top: 5px; padding-left: 2px;
        }

        .row-opts {
          display: flex; align-items: center;
          justify-content: space-between;
          margin: 0.25rem 0 1.5rem;
        }

        .check-label {
          display: flex; align-items: center; gap: 8px;
          font-size: 13.5px; color: #555f6d;
          cursor: pointer; user-select: none;
          -webkit-tap-highlight-color: transparent;
        }

        .custom-check {
          width: 18px; height: 18px;
          border: 1.5px solid #d0d5dd;
          border-radius: 5px; background: #fff;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          transition: background 0.15s, border-color 0.15s;
        }
        .custom-check.checked { background: #3b5bfc; border-color: #3b5bfc; }

        .forgot-link {
          font-size: 13.5px; color: #3b5bfc;
          text-decoration: none; font-weight: 500;
          -webkit-tap-highlight-color: transparent;
        }

        /* ── Primary button ── */
        .btn-primary {
          width: 100%;
          padding: 14px;
          font-size: 15.5px; font-weight: 600;
          font-family: 'DM Sans', sans-serif;
          background: #3b5bfc;
          color: #fff;
          border: none; border-radius: 14px;
          cursor: pointer; letter-spacing: 0.1px;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: background 0.15s, transform 0.1s, opacity 0.15s;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
          position: relative;
        }
        .btn-primary:hover:not(:disabled) { background: #2f4de0; }
        .btn-primary:active:not(:disabled) { transform: scale(0.98); background: #2642c8; }
        .btn-primary:disabled { opacity: 0.78; cursor: not-allowed; }

        /* ── Pure CSS spinner — Tailwind kerak emas ── */
        .btn-spinner {
          width: 18px; height: 18px;
          border: 2.5px solid rgba(255,255,255,0.3);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: btn-spin 0.65s linear infinite;
          flex-shrink: 0;
        }
        @keyframes btn-spin {
          to { transform: rotate(360deg); }
        }

        .signup-row {
          text-align: center; margin-top: 1.25rem;
          font-size: 13.5px; color: #9098a3;
        }
        .signup-row a { color: #3b5bfc; font-weight: 600; text-decoration: none; }
      `}</style>

			<div className='app-shell'>
				<div className='login-card'>
					{/* Header */}
					<div className='header'>
						<div className='logo-ring'>
							<svg
								viewBox='0 0 48 48'
								width='34'
								height='34'
								xmlns='http://www.w3.org/2000/svg'
							>
								<path
									fill='#4285F4'
									d='M46.145 20.047H44.4V19.96H24v8.08h12.744C35.052 32.896 30.012 36.08 24 36.08c-6.672 0-12.08-5.408-12.08-12.08S17.328 11.92 24 11.92c3.02 0 5.764 1.116 7.864 2.94l5.712-5.712C34.004 6.42 29.252 4.24 24 4.24 12.736 4.24 3.6 13.376 3.6 24.64S12.736 45.04 24 45.04c10.96 0 20.4-8.88 20.4-20.4 0-1.368-.144-2.704-.4-3.993z'
								/>
								<path
									fill='#34A853'
									d='M6.68 15.348l6.648 4.876C14.944 16.364 19.14 13.92 24 13.92c3.02 0 5.764 1.116 7.864 2.94l5.712-5.712C34.004 8.42 29.252 6.24 24 6.24c-7.508 0-13.992 4.3-17.32 9.108z'
								/>
								<path
									fill='#FBBC05'
									d='M24 45.04c5.164 0 9.848-1.984 13.376-5.208l-6.176-5.228C29.26 36.036 26.74 37.04 24 37.04c-5.992 0-11.02-3.16-12.732-7.76l-6.608 5.092C8.104 40.468 15.52 45.04 24 45.04z'
								/>
								<path
									fill='#EA4335'
									d='M46.12 20.64H44.4V20H24v8h12.744c-.876 2.604-2.572 4.844-4.76 6.4l.004-.004 6.176 5.228C37.88 41.444 44 37.04 44 24c0-1.168-.116-2.308-.336-3.36z'
								/>
							</svg>
						</div>
						<div className='header-title'>Xush kelibsiz</div>
						<div className='header-sub'>Hisobingizga kiring</div>
					</div>

					<div className='divider' />

					{/* Gmail */}
					<div className='field-group'>
						<label className='field-label'>Gmail manzil</label>
						<input
							className={`field-input${errors.gmail ? ' error' : ''}`}
							type='email'
							inputMode='email'
							autoComplete='email'
							placeholder='example@gmail.com'
							value={gmail}
							disabled={isLoading}
							onChange={e => setGmail(e.target.value)}
							onKeyDown={handleKeyDown}
						/>
						{errors.gmail && <div className='err-text'>{errors.gmail}</div>}
					</div>

					{/* Parol */}
					<div className='field-group'>
						<label className='field-label'>Parol</label>
						<div className='pass-wrap'>
							<input
								className={`field-input${errors.password ? ' error' : ''}`}
								type={showPass ? 'text' : 'password'}
								autoComplete='current-password'
								placeholder='Parolni kiriting'
								value={password}
								disabled={isLoading}
								onChange={e => setPassword(e.target.value)}
								onKeyDown={handleKeyDown}
							/>
							<button
								className='toggle-btn'
								onClick={() => setShowPass(v => !v)}
								tabIndex={-1}
								type='button'
							>
								{showPass ? (
									<svg
										viewBox='0 0 24 24'
										width='18'
										height='18'
										fill='none'
										stroke='currentColor'
										strokeWidth='1.8'
									>
										<path d='M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94' />
										<path d='M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19' />
										<line x1='1' y1='1' x2='23' y2='23' />
									</svg>
								) : (
									<svg
										viewBox='0 0 24 24'
										width='18'
										height='18'
										fill='none'
										stroke='currentColor'
										strokeWidth='1.8'
									>
										<path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' />
										<circle cx='12' cy='12' r='3' />
									</svg>
								)}
							</button>
						</div>
						{errors.password && (
							<div className='err-text'>{errors.password}</div>
						)}
					</div>

					{/* Eslab qolish + Forgot */}
					<div className='row-opts'>
						<label
							className='check-label'
							onClick={() => !isLoading && setRemember(v => !v)}
						>
							<div className={`custom-check${remember ? ' checked' : ''}`}>
								{remember && (
									<svg
										viewBox='0 0 12 12'
										width='11'
										height='11'
										fill='none'
										stroke='#fff'
										strokeWidth='2'
									>
										<polyline points='2 6 5 9 10 3' />
									</svg>
								)}
							</div>
							Eslab qolish
						</label>
						<a
							href='#'
							className='forgot-link'
							onClick={e => e.preventDefault()}
						>
							Parolni unutdingizmi?
						</a>
					</div>

					{/* Submit */}
					<button
						className='btn-primary'
						disabled={isLoading}
						onClick={handleLogin}
						type='button'
					>
						{isLoading ? (
							<>
								<span className='btn-spinner' />
								Kirish...
							</>
						) : (
							'Kirish'
						)}
					</button>

					<div className='signup-row'>
						Hisobingiz yo'qmi? <Link to='/register'>Ro'yxatdan o'ting</Link>
					</div>
				</div>
			</div>
		</>
	)
}
