const email = import.meta.env.VITE_SUPPORT_EMAIL?.trim();
const hotline = import.meta.env.VITE_SUPPORT_HOTLINE?.trim();

export const supportContact = {
  email: email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null,
  hotline: hotline && /^\+?[\d\s().-]{6,24}$/.test(hotline) ? hotline : null,
};
