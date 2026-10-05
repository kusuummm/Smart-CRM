import api from './client';

export const loginRequest = (email, password) =>
  api.post('/auth/login', { email, password }).then((res) => res.data);

export const getMeRequest = () =>
  api.get('/auth/me').then((res) => res.data);

export const updateMeRequest = (payload) =>
  api.put('/auth/me', payload).then((res) => res.data);

export const getSessionsRequest = () =>
  api.get('/auth/sessions').then((res) => res.data);

export const revokeSessionRequest = (id) =>
  api.delete(`/auth/sessions/${id}`).then((res) => res.data);

export const logoutRequest = () =>
  api.post('/auth/logout').then((res) => res.data);

export const changePasswordRequest = (currentPassword, newPassword) =>
  api
    .put('/auth/change-password', {
      currentPassword,
      newPassword,
    })
    .then((res) => res.data);

// Registration with OTP
export const registerSendOtpRequest = (payload) =>
  api.post('/auth/register/send-otp', payload).then((res) => res.data);

export const registerVerifyOtpRequest = (payload) =>
  api.post('/auth/register/verify-otp', payload).then((res) => res.data);

// Forgot Password with OTP
export const forgotPasswordSendOtpRequest = (payload) =>
  api.post('/auth/forgot-password/send-otp', payload).then((res) => res.data);

export const forgotPasswordVerifyResetRequest = (payload) =>
  api.post('/auth/forgot-password/verify-reset', payload).then((res) => res.data);

// Profile Change Password with OTP
export const profileSendOtpRequest = () =>
  api.post('/auth/profile/send-otp').then((res) => res.data);

export const profileChangePasswordOtpRequest = (payload) =>
  api.put('/auth/profile/change-password-otp', payload).then((res) => res.data);

