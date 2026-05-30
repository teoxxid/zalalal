import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import { registerThunk } from '../store/thunks/authThunks';
import { showNotification } from '../store/slices/uiSlice';
import { clearError } from '../store/slices/authSlice';

const Register: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const { isLoading, error: reduxError, isAuthenticated } = useSelector(
    (state: RootState) => state.auth
  );

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    return () => { dispatch(clearError()); };
  }, [dispatch]);

  const validateForm = () => {
    if (!username.trim()) return 'Введите имя пользователя';
    if (username.length < 3) return 'Имя должно содержать минимум 3 символа';
    if (!email.trim()) return 'Введите email';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Введите корректный email';
    if (!password) return 'Введите пароль';
    if (password.length < 6) return 'Пароль должен содержать минимум 6 символов';
    if (password !== confirmPassword) return 'Пароли не совпадают';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    const validationError = validateForm();
    if (validationError) {
      setLocalError(validationError);
      return;
    }

    const result = await dispatch(registerThunk({ username, email, password }));

    if (registerThunk.fulfilled.match(result)) {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      dispatch(showNotification({
        type: 'success',
        message: `Регистрация успешна! Добро пожаловать, ${username}!`,
      }));
      
      navigate('/', { replace: true });
    } else {
      const errorMsg = (result.payload as string) || reduxError || 'Ошибка регистрации';
      setLocalError(typeof errorMsg === 'string' ? errorMsg : 'Ошибка регистрации');
      dispatch(showNotification({ type: 'error', message: 'Не удалось зарегистрироваться' }));
    }
  };

  const errorMessage = localError || reduxError;

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">Регистрация</h1>
          <p className="auth-subtitle">Создайте аккаунт для доступа ко всем функциям</p>
        </div>

        {errorMessage && (
          <div className="alert alert-danger" role="alert">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="reg-username">
              Имя пользователя
            </label>
            <input
              id="reg-username"
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Придумайте имя пользователя"
              required
              disabled={isLoading}
              minLength={3}
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">
              Email
            </label>
            <input
              id="reg-email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              required
              disabled={isLoading}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-password">
              Пароль
            </label>
            <input
              id="reg-password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Минимум 6 символов"
              required
              disabled={isLoading}
              minLength={6}
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-confirm">
              Подтвердите пароль
            </label>
            <input
              id="reg-confirm"
              type="password"
              className="form-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Повторите пароль"
              required
              disabled={isLoading}
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={isLoading}
          >
            {isLoading ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>
        </form>

        <div className="auth-footer">
          <span>Уже есть аккаунт?</span>
          <Link to="/login/" className="auth-link">
            Войти
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
