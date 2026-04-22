export const isValidOtp = (otp) => {
  const pattern = /^\d{6}$/;

  return pattern.test(otp);
};
