export const isValidPassword = (password) => {
  const pattern = /^.{8,}$/;

  return pattern.test(password);
};

export const passwordsMatch = (password, confirmPassword) => {
  return password === confirmPassword;
};
