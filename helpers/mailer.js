const nodemailer = require('nodemailer');
const fs = require('fs');
const Configuration = require('../library/Configs');
const conf = Configuration.getConfig();

function formatMessage(html, data) {
    let template = String(html)
    for (const key in data) {
        const value = data[key];
        var re = new RegExp('{{' + key + '}}', 'g');
        template = template.replace(re, value);
    }
    return template;
}

// async..await is not allowed in global scope, must use a wrapper
async function mail({ to, message, subject, from = conf.email.sender, image = null }) {

    let _image = !image ? "" : `<img width="100%" src="${conf.api_link}images/${image}">`;
    const emailDatas = {
        header: subject, //message subject
        message: message,
        date: new Date(),
        image: _image,
        app_name: conf.app_name,
        sitelink: conf.site_link,
        disclaimer: `<p>This is a confidential email and may also be privileged. If you are not the intended recipient, please inform us immediately. You are not allowed to copy or use it for any purpose nor disclose its contents to any other person Please note that there is a risk that information requested via email can be tampered with, by hackers while en route to your mailbox or seen by unauthenticated individuals if your mailbox security is inadequate E-Statements are your contribution towards a safer, cleaner environment. We thank you for contributing to the protection of our environment, do not print this mail.</p><p>DISCLAIMER: This email and any attachments are confidential and are intended solely for the addressee. If you are not the addressee tell the sender immediately and destroy it. Do not open, read, copy, disclose, use or store it in any way, or permit others to do so. Emails are not secure and may suffer errors, viruses, delay, interception, and amendment. ${conf.app_name} and its subsidiaries do not accept liability for damage caused by this email and may monitor email traffic.</p>`,
    };

    const html = fs.readFileSync(process.cwd() + '/email-tpl/default.html');
    let template = formatMessage(html, emailDatas);

    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport(conf.email);
    // send mail with defined transport object
    let info = await transporter.sendMail({
        from: from, // sender address
        to: to, // list of receivers
        subject: subject, // Subject line
        text: message, // plain text body
        html: `${template}`, // html body
    }).catch((error) => {
        console.log("Message error %s", error);
    });
    console.log("Message sent: %s", info);
}

module.exports = { mail };