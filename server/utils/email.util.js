import resend from "../../config/resendConfig.js";

export const isValidEmail = (email) => {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return pattern.test(email);
};

export const sendVerificationEmail = async (email, link) => {
  await resend.emails.send({
    from: "Clipo <onboarding@resend.dev>",
    to: email,
    subject: "Verify your email",
    html: `<a href="${link}">Verify Email</a>`,
  });
};
