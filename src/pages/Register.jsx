import { useRegisterMutation } from '@/store/api'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

// savedUsers endi API ga ketadi, lokal kerak emas
const initialForm = {
	firstname: '',
	lastname: '',
	birthday: '',
	email: '',
	password: '',
	biography: '',
	job: '',
}

const initialErrors = {
	firstname: '',
	lastname: '',
	birthday: '',
	email: '',
	password: '',
	biography: '',
	job: '',
}

export default function Register() {
	const [register, { isLoading }] = useRegisterMutation()
	const navigate = useNavigate()
	const [form, setForm] = useState(initialForm)
	const [errors, setErrors] = useState(initialErrors)
	const [showPass, setShowPass] = useState(false)
	const [submitted, setSubmitted] = useState(null)

	const set = field => e =>
		setForm(prev => ({ ...prev, [field]: e.target.value }))

	const validate = () => {
		const errs = { ...initialErrors }
		if (!form.firstname.trim()) errs.firstname = 'Ism kiritilishi shart'
		if (!form.lastname.trim()) errs.lastname = 'Familiya kiritilishi shart'
		if (!form.birthday) errs.birthday = "Tug'ilgan sana kiritilishi shart"
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
			errs.email = "To'g'ri email manzil kiriting"
		if (form.password.length < 6)
			errs.password = "Parol kamida 6 ta belgidan iborat bo'lishi kerak"
		if (!form.biography.trim()) errs.biography = 'Biografiya kiritilishi shart'
		if (!form.job.trim()) errs.job = 'Kasb kiritilishi shart'
		return errs
	}

	const hasErrors = errs => Object.values(errs).some(Boolean)

	const handleSubmit = async () => {
		const errs = validate()
		setErrors(errs)
		if (hasErrors(errs)) return

		try {
			const body = {
				firstname: form.firstname.trim(),
				lastname: form.lastname.trim(),
				birthday: form.birthday,
				email: form.email.trim(),
				password: form.password,
				biography: form.biography.trim(),
				job: form.job.trim(),
			}

			const res = await register(body).unwrap()

			// Success ekrani uchun — parolni yulduzcha bilan ko'rsatamiz
			setSubmitted({
				firstname: body.firstname,
				lastname: body.lastname,
				birthday: body.birthday,
				email: body.email,
				password: '*'.repeat(form.password.length),
				biography: body.biography,
				job: body.job,
				registeredAt: new Date().toLocaleString('uz-UZ'),
			})
		} catch (error) {
			const msg =
				error?.data?.message ||
				error?.data?.error ||
				error?.message ||
				"Ro'yxatdan o'tishda xatolik yuz berdi. Iltimos, ma'lumotlarni tekshiring."
			toast.error(msg)
		}
	}

	const handleReset = () => {
		setForm(initialForm)
		setErrors(initialErrors)
		setShowPass(false)
		setSubmitted(null)
		navigate('/login') // Ro'yxatdan keyin login sahifasiga yo'naltirish
	}

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
          align-items: flex-start;
          justify-content: center;
          font-family: 'DM Sans', sans-serif;
          padding: 1.5rem 1rem;
        }

        @media (max-width: 480px) {
          .app-shell {
            padding: 0;
            background: #ffffff;
            align-items: stretch;
          }
        }

        .register-card {
          width: 100%;
          max-width: 460px;
          background: #ffffff;
          border-radius: 24px;
          padding: 2.5rem 1.75rem 2rem;
          box-shadow: 0 4px 40px rgba(0,0,0,0.08);
        }

        @media (max-width: 480px) {
          .register-card {
            max-width: 100%;
            border-radius: 0;
            box-shadow: none;
            padding: 3.5rem 1.5rem 2.5rem;
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
        .header-title { font-size: 22px; font-weight: 600; color: #0d0d0d; letter-spacing: -0.3px; }
        .header-sub { font-size: 13.5px; color: #9098a3; margin-top: 4px; }

        .divider { height: 1px; background: #f0f2f5; margin: 0 0 1.75rem; }

        .field-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 1rem;
        }
        @media (max-width: 360px) {
          .field-row { grid-template-columns: 1fr; }
        }

        .field-group { margin-bottom: 1rem; }
        .field-group.no-mb { margin-bottom: 0; }

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

        textarea.field-input { resize: none; min-height: 90px; line-height: 1.5; }

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

        .err-text { font-size: 12px; color: #f03e3e; margin-top: 5px; padding-left: 2px; }

        .section-label {
          font-size: 11px; font-weight: 600;
          color: #c2c8d0;
          text-transform: uppercase; letter-spacing: 1px;
          margin: 1.5rem 0 1rem;
          display: flex; align-items: center; gap: 8px;
        }
        .section-label::after { content: ''; flex: 1; height: 1px; background: #f0f2f5; }

        /* Button */
        .btn-primary {
          width: 100%; padding: 14px;
          font-size: 15.5px; font-weight: 600;
          font-family: 'DM Sans', sans-serif;
          background: #3b5bfc; color: #fff;
          border: none; border-radius: 14px;
          cursor: pointer; letter-spacing: 0.1px;
          margin-top: 1.5rem;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: background 0.15s, transform 0.1s, opacity 0.15s;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }
        .btn-primary:hover:not(:disabled) { background: #2f4de0; }
        .btn-primary:active:not(:disabled) { transform: scale(0.98); background: #2642c8; }
        .btn-primary:disabled { opacity: 0.78; cursor: not-allowed; }

        /* Pure CSS spinner */
        .btn-spinner {
          width: 18px; height: 18px;
          border: 2.5px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: btn-spin 0.65s linear infinite;
          flex-shrink: 0;
        }
        @keyframes btn-spin { to { transform: rotate(360deg); } }

        .login-row {
          text-align: center; margin-top: 1.25rem;
          font-size: 13.5px; color: #9098a3;
        }
        .login-row a { color: #3b5bfc; font-weight: 600; text-decoration: none; }

        /* Success */
        .success-wrap {
          text-align: center;
          animation: fadeUp 0.4s ease both;
          display: flex; flex-direction: column; align-items: center;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .success-icon {
          width: 68px; height: 68px;
          border-radius: 50%;
          background: #e8faf0; border: 2px solid #b2f0cd;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 1.1rem;
        }
        .success-title { font-size: 20px; font-weight: 600; color: #0d0d0d; margin-bottom: 5px; }
        .success-sub { font-size: 13.5px; color: #9098a3; margin-bottom: 1.5rem; max-width: 300px; }

        .data-box {
          width: 100%;
          background: #f7f8fa; border: 1.5px solid #eaecef;
          border-radius: 14px; padding: 1rem 1.1rem;
          text-align: left; margin-bottom: 1.5rem;
        }
        .data-row {
          display: flex; justify-content: space-between;
          align-items: flex-start; padding: 7px 0;
          font-size: 13.5px; gap: 12px;
        }
        .data-row:not(:last-child) { border-bottom: 1px solid #eaecef; }
        .data-key { color: #9098a3; white-space: nowrap; flex-shrink: 0; }
        .data-val { color: #0d0d0d; font-weight: 500; text-align: right; word-break: break-word; max-width: 60%; }

        .btn-back {
          width: 100%; padding: 13px;
          font-size: 14.5px; font-weight: 500;
          font-family: 'DM Sans', sans-serif;
          background: #f0f4ff; color: #3b5bfc;
          border: none; border-radius: 14px;
          cursor: pointer; transition: background 0.15s;
          -webkit-tap-highlight-color: transparent;
        }
        .btn-back:hover { background: #dce4ff; }

        .progress-wrap { margin-bottom: 1.75rem; }
        .progress-bar-track { height: 4px; background: #eaecef; border-radius: 99px; overflow: hidden; }
        .progress-bar-fill { height: 100%; background: #3b5bfc; border-radius: 99px; transition: width 0.35s ease; }
        .progress-text { font-size: 11.5px; color: #b0b8c4; margin-top: 6px; text-align: right; }
      `}</style>

			<div className='app-shell'>
				<div className='register-card'>
					{!submitted ? (
						<>
							<div className='header'>
								<div className='logo-ring'>
									<svg
										viewBox='0 0 24 24'
										width='28'
										height='28'
										fill='none'
										stroke='#3b5bfc'
										strokeWidth='1.8'
									>
										<path d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' />
										<circle cx='12' cy='7' r='4' />
									</svg>
								</div>
								<div className='header-title'>Ro'yxatdan o'tish</div>
								<div className='header-sub'>Yangi hisob yaratish</div>
							</div>

							{(() => {
								const filled = Object.values(form).filter(
									v => v.trim?.() || v,
								).length
								const total = Object.keys(form).length
								const pct = Math.round((filled / total) * 100)
								return (
									<div className='progress-wrap'>
										<div className='progress-bar-track'>
											<div
												className='progress-bar-fill'
												style={{ width: `${pct}%` }}
											/>
										</div>
										<div className='progress-text'>
											{filled}/{total} maydon to'ldirildi
										</div>
									</div>
								)
							})()}

							<div className='divider' style={{ margin: '0 0 1.5rem' }} />

							<div className='section-label'>Shaxsiy ma'lumotlar</div>

							<div className='field-row'>
								<div className='field-group no-mb'>
									<label className='field-label'>Ism</label>
									<input
										className={`field-input${errors.firstname ? ' error' : ''}`}
										type='text'
										autoComplete='given-name'
										placeholder='Ismingiz'
										value={form.firstname}
										disabled={isLoading}
										onChange={set('firstname')}
									/>
									{errors.firstname && (
										<div className='err-text'>{errors.firstname}</div>
									)}
								</div>
								<div className='field-group no-mb'>
									<label className='field-label'>Familiya</label>
									<input
										className={`field-input${errors.lastname ? ' error' : ''}`}
										type='text'
										autoComplete='family-name'
										placeholder='Familiyangiz'
										value={form.lastname}
										disabled={isLoading}
										onChange={set('lastname')}
									/>
									{errors.lastname && (
										<div className='err-text'>{errors.lastname}</div>
									)}
								</div>
							</div>

							<div className='field-group' style={{ marginTop: '1rem' }}>
								<label className='field-label'>Tug'ilgan sana</label>
								<input
									className={`field-input${errors.birthday ? ' error' : ''}`}
									type='date'
									autoComplete='bday'
									value={form.birthday}
									disabled={isLoading}
									onChange={set('birthday')}
									max={new Date().toISOString().split('T')[0]}
								/>
								{errors.birthday && (
									<div className='err-text'>{errors.birthday}</div>
								)}
							</div>

							<div className='section-label'>Ish ma'lumotlari</div>

							<div className='field-group'>
								<label className='field-label'>Kasb / Lavozim</label>
								<input
									className={`field-input${errors.job ? ' error' : ''}`}
									type='text'
									autoComplete='organization-title'
									placeholder='Masalan: Frontend Developer'
									value={form.job}
									disabled={isLoading}
									onChange={set('job')}
								/>
								{errors.job && <div className='err-text'>{errors.job}</div>}
							</div>

							<div className='field-group'>
								<label className='field-label'>Biografiya</label>
								<textarea
									className={`field-input${errors.biography ? ' error' : ''}`}
									placeholder="O'zingiz haqida qisqacha..."
									value={form.biography}
									disabled={isLoading}
									onChange={set('biography')}
									rows={3}
								/>
								{errors.biography && (
									<div className='err-text'>{errors.biography}</div>
								)}
							</div>

							<div className='section-label'>Kirish ma'lumotlari</div>

							<div className='field-group'>
								<label className='field-label'>Email</label>
								<input
									className={`field-input${errors.email ? ' error' : ''}`}
									type='email'
									inputMode='email'
									autoComplete='email'
									placeholder='example@email.com'
									value={form.email}
									disabled={isLoading}
									onChange={set('email')}
								/>
								{errors.email && <div className='err-text'>{errors.email}</div>}
							</div>

							<div className='field-group'>
								<label className='field-label'>Parol</label>
								<div className='pass-wrap'>
									<input
										className={`field-input${errors.password ? ' error' : ''}`}
										type={showPass ? 'text' : 'password'}
										autoComplete='new-password'
										placeholder='Kamida 6 ta belgi'
										value={form.password}
										disabled={isLoading}
										onChange={set('password')}
									/>
									<button
										className='toggle-btn'
										type='button'
										tabIndex={-1}
										onClick={() => setShowPass(v => !v)}
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

							<button
								className='btn-primary'
								type='button'
								disabled={isLoading}
								onClick={handleSubmit}
							>
								{isLoading ? (
									<>
										<span className='btn-spinner' />
										Yuklanmoqda...
									</>
								) : (
									"Ro'yxatdan o'tish"
								)}
							</button>

							<div className='login-row'>
								Hisobingiz bormi? <Link to='/login'>Kirish</Link>
							</div>
						</>
					) : (
						<div className='success-wrap'>
							<div className='success-icon'>
								<svg
									viewBox='0 0 24 24'
									width='30'
									height='30'
									fill='none'
									stroke='#2da85c'
									strokeWidth='2.5'
								>
									<polyline points='20 6 9 17 4 12' />
								</svg>
							</div>
							<div className='success-title'>Ro'yxatdan o'tdingiz!</div>
							<div className='success-sub'>
								{submitted.firstname} {submitted.lastname}, hisobingiz
								muvaffaqiyatli yaratildi
							</div>

							<div className='data-box'>
								{[
									{ key: 'Ism', val: submitted.firstname },
									{ key: 'Familiya', val: submitted.lastname },
									{ key: "Tug'ilgan sana", val: submitted.birthday },
									{ key: 'Email', val: submitted.email },
									{ key: 'Parol', val: submitted.password },
									{ key: 'Kasb', val: submitted.job },
									{ key: 'Biografiya', val: submitted.biography },
									{ key: 'Sana', val: submitted.registeredAt },
								].map(({ key, val }) => (
									<div className='data-row' key={key}>
										<span className='data-key'>{key}</span>
										<span className='data-val'>{val}</span>
									</div>
								))}
							</div>

							<button className='btn-back' onClick={handleReset}>
								Kirish uchun qaytish
							</button>
						</div>
					)}
				</div>
			</div>
		</>
	)
}
