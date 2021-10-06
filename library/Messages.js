const Configuration = require('./Configs');
const conf = Configuration.getConfig();

function welcomNewUser({ name }) {
    return `<p>Welcome ${name}<p>Thanks for creating an account with us, we appreciate you becoming a part of our community.<p>
    <p>If you have any questions we're always happy to help, and our customer service team is only an email away 🙂.</p>
   <p> First, you need to create a transfer wallet to enable you to start sending money</p>`
}

function password_message_email({ name, password }) {
    return `Dear ${name},
    <p>Someone requested for the password of ${conf.app_name} login. If this was a mistake, just ignore this email and nothing will happen.
    <p>We advice that you change your password frequently. See your password below: 
    <p>Password: ${password}, Please change your password after you sign in.
    <p>Thank you'.`
}

function password_message_sms({ password }) {
    return `Password: ${password} . Please change your password after you sign in. Thank you'.`
}

module.exports = {
    welcomNewUser,
    password_message_email,
    password_message_sms
};