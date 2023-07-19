const nodemailer = require('nodemailer');
const pug = require('pug');
const { convert } =  require('html-to-text');

// new Email(user, url).sendWelcome();

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from =  `sanskar soni <${process.env.EMAIL_FROM}>`
  }

  newTransport() {
    if(process.env.NODE_ENV === 'production'){

      
      return nodemailer.createTransport({

        service: 'SendinBlue',
        auth: {
          user: process.env.SENDINBLUE_USERNAME,
          pass: process.env.SENDINBLUE_SMTP_KEY,
        }

      });
    }

    return nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        auth: {
          user: process.env.EMAIL_USERNAME,
          pass: process.env.EMAIL_PASSWORD,
        },
    });
  }

  // SEND THE ACTUAL MAIL
  async send(template, subject){
    
    // RENDER HTML BASED ON A PUG TEMPLATE
    const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
      firstName: this.firstName,
      url:this.url,
      subject
    })


    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: convert(html)
    };

    // 3) CREATE A TRANSPORTER AND SEND MAIL

  await this.newTransport().sendMail(mailOptions);

  }

 async sendWelcome() {
    await this.send('welcome', 'welcome to the natours family');
  }
  async sendPasswordReset() {
    await this.send('passwordReset','your password token valid for only 10 minutes')
  }
}
















// const sendEmail = async (options) => {
//   // 1) Create a transporter
//   const transporter = nodemailer.createTransport({
//     host: process.env.EMAIL_HOST,
//     port: process.env.EMAIL_PORT,
//     auth: {
//       user: process.env.EMAIL_USERNAME,
//       pass: process.env.EMAIL_PASSWORD,
//     },
//     // activate in gmail "less secure app" option
//   });

//   // 2) Define the email options
//   const mailOptions = {
//     from: 'Sanskar soni <sanskarsoni.cse23@jecrc.ac.in',
//     to: options.email,
//     subject: options.subject,
//     text: options.message,
//   };

//   // 3) Actually send the email
//   await transporter.sendMail(mailOptions);
// };