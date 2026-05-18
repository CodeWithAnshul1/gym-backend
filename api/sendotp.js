require("dotenv").config();

const axios = require("axios");

const sendmail = async (otp, email, type) => {

  try {

    const res = await axios.post(
      "https://api.brevo.com/v3/smtp/email",

      {
        sender: {
          name: "anshulgymhub",
          email: "anshulmogha50@gmail.com"
        },

        to: [
          {
            email: email
          }
        ],

        subject: `Your ${type} OTP`,

        htmlContent: `
          <div style="font-family:sans-serif">

            <h2>Your six digit OTP</h2>

            <h1>${otp}</h1>

            <p>This OTP expires in 5 minutes.</p>

          </div>
        `
      },

      {
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("Mail sent successfully");
    console.log(res.data);

  } catch (err) {

    console.log(
      "MAIL ERROR:",
      err.response?.data || err.message
    );
  }
};

module.exports = sendmail;