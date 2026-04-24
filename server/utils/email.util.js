import resend from "../../config/resendConfig.js";

export const isValidEmail = (email) => {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return pattern.test(email);
};

export const sendVerificationEmail = async (email, link) => {
  await resend.emails.send({
    from: "Clippointment <onboarding@resend.dev>",
    to: email,
    subject: "Verify your email",
    html: `<a href="${link}">Verify Email</a>`,
  });
};

export const sendPasswordResetEmail = async (email, code) => {
  await resend.emails.send({
    from: "Clippointment <onboarding@resend.dev>",
    to: email,
    subject: "Password reset 6-digit code",
    text: `Here is the 6-digit code ${code}. This expires in 3 minutes`,
  });
};
