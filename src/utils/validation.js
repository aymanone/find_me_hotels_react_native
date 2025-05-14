export const validEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validPasswordSignup = (password) => {
  // Password must be at least 8 characters long and contain:
  // - At least one uppercase letter
  // - At least one lowercase letter
  // - At least one number
  // Can include special characters
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return passwordRegex.test(password);
};

export const validPhoneNumber = (phoneNumber) => {
  // International phone number validation
  // Must start with + or numbers for country code
  // Must be between 10 and 15 digits total (including country code)
  const phoneRegex = /^(\+|[0-9]{1,3})[0-9]{9,14}$/;
  return phoneRegex.test(phoneNumber);
};
