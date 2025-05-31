// <= DOTENV CONFIGURATION =>
import dotenv from "dotenv";
dotenv.config({});

// <= IMPORTS =>
import nodemailer from "nodemailer";

// <= CONFIGURING MAIL TRANSPORTER =>
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// <= MAIL HELPER FUNCTION =>
/**
 * ATTEMPTS TO SEND AN EMAIL WITH RETRY LOGIC, IF EMAIL SENDING FAILS
 * @param {object} mailOptions - The Mail Options for NodeMailer Send Mail
 * @param {number} maxRetries - Maximum Number or Retries Attempts - Default to 7
 * @param {number} delay - Delay in Milliseconds before each Retry - Default to (1000 = 1s)
 */
const sendMailWithRetry = async (mailOptions, maxRetries = 7, delay = 1000) => {
  try {
    // ATTEMPTS TO SEND EMAIL
    return await transporter.sendMail(mailOptions);
  } catch (error) {
    // ERROR HANDLING
    console.error("Error Sending Mail, Retries Left:", maxRetries, error);
    // IF RETIRES ARE LEFT, RETRYING TO SEND EMAIL WITH RETRY FUNCTION
    if (maxRetries > 0) {
      // SET TIMEOUT FUNCTION TO ADD DELAY IN EACH RETRY
      await new Promise((resolve) => setTimeout(resolve, delay));
      // RETURNING THE RETRY FUNCTION TO ATTEMPT SENDING MAIL AGAIN
      return sendMailWithRetry(mailOptions, maxRetries - 1, delay * 2);
    }
    // AFTER RETRIES FINISHED, THROWING AN ERROR IN EMAIL NOT SENT
    throw error;
  }
};

// <= MAILER FUNCTIONS =>

/**
 * SENDS VERIFICATION EMAIL TO THE USER ASKING VERIFICATION
 * @param {String} toEmail - Email of the User to be Verified 
 * @param {Number} code - The 6 Digit Code sent in the Email
 * @param {object} user - The Complete User Object

 */
// MAILER # 1 : USER'S EMAIL CONFIRMATION EMAIL :
export const sendVerificationEmail = async (toEmail, code, user) => {
  // MAIL OPTIONS
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: toEmail,
    subject: `JobHunt - Account Email Verification for ${user.fullName}`,
    html: `
        <h1>Dear ${user.fullName}!<h1/>
        <h2>In Order to Complete your Registration at JobHunt you need to Confirm your Email Address, please enter the Following Code:<h2/>
        <h2>${code}<strong/><h2/>
        <h3>If you did not asked for this Account Email Verification, Please Ignore this Email.<h3/>
        <h4>Best Regards<br/>JobHunt Team</h4>
        `,
  };
  return sendMailWithRetry(mailOptions);
};

/**
 * SENDS CONFIRMATION EMAIL TO THE USER ASKING FOR EMAIL VERIFICATION
 * @param {String} toEmail - Email of the User Verified
 * @param {object} user - The Complete User Object
 */
// MAILER # 2 : EMAIL VERIFICATION CONFIRMATION EMAIL
export const sendEmailVerificationConfirmationEmail = async (toEmail, user) => {
  // MAIL OPTIONS
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: toEmail,
    subject: `JobHunt - Email Verification Confirmation for ${user.fullName}`,
    html: `
      <h1>Dear ${user.fullName}!<h1/>
        <h2>Your Email Verification is Successful.<h2/>
        <h2>The Email Verification Requested for your Account Registration at JobHunt has been Successfully Completed.<h2/>
        <h4>Best Regards<br/>JobHunt Team</h4>
    `,
  };
  return sendMailWithRetry(mailOptions);
};

/**
 * SENDS AN EMAIL TO THE USER WHO IS REGISTERED
 * @param {String} toEmail - Email of the User Registered
 * @param {object} user - The Complete User Object
 */
// MAILER # 3 : SEND USER REGISTRATION EMAIL
export const sendUserRegistrationEmail = async (toEmail, user) => {
  // FORMATTING THE DATE TO APPEND WITH EMAIL
  const formattedDate = new Date(user.createdAt).toLocaleString("en-us", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  // SETTING HTML FOR EMAIL BODY
  const html = `
    <h1>Welcome ${user.fullName}</h1>
    <h2>You have successfully Registered Yourself at JobHunt. JobHunt is Ranked # 1 Job Application Website in the World. Dive in to the World of High Quality & Well Paid Jobs as well as Leading Companies.</h2>
    <h3>We Hope to get in Touch with you in Future.</h3>
    <h4>Best Regards<br/>JobHunt Team</h4>
  `;
  // MAIL OPTIONS
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: toEmail,
    subject: `Welcome to JobHunt ${user.fullName}`,
    html,
  };
  return sendMailWithRetry(mailOptions);
};

/**
 * SENDS A JOB APPLICATION CONFIRMATION EMAIL TO THE USER
 * @param {String} toEmail - Email of the User Applied for the Job
 * @param {object} job - The Complete Job Object
 * @param {object} applicant - The Complete Applicant Object
 * @param {String} applicationDate - The Date of Applied Job
 */
// MAILER # 4 : APPLICATION CONFIRMATION EMAIL
export const sendApplicationConfirmationEmail = async (
  toEmail,
  job,
  applicant,
  applicationDate
) => {
  // FORMATTING THE DATE TO APPEND WITH EMAIL
  const formattedDate = new Date(applicationDate).toLocaleString("en-us", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  // MAIL OPTIONS
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: toEmail,
    subject: `Job for the Position ${job.title} Applied Successfully`,
    html: `
    <h1>Job Applied Successfully</h1>
    <h2>Dear ${applicant.fullName}</h2>
    <h2>You have successfully Applied for the Position of ${job.title} at ${job.company.name} (Located in ${job.location}) on ${formattedDate}.</h2>
    <h3>${job.company.name} Hiring Team will Review your Application & get back to you Shortly.</h3>
    <h3>Thank You for using JobHunt</h3>
    <h4>Best Regards<br/>JobHunt Team</h4>
    `,
  };
  return sendMailWithRetry(mailOptions);
};

/**
 * SENDS AN APPLICATION STATUS EMAIL TO THE USER (ACCEPTED OR REJECTED)
 * @param {String} toEmail - Email of the User Who Applied for the Job
 * @param {object} applicant - The Complete Applicant Object
 * @param {object} job - The Complete Job Object
 * @param {object} application - The Complete Application Object
 * @param {String} status - The Status Forwarded (ACCEPTED OR REJECTED)
 */
// MAILER # 5 : APPLICATION STATUS EMAIL
export const sendApplicationStatusEmail = async (
  toEmail,
  applicant,
  job,
  application,
  status
) => {
  // FORMATTING THE DATE TO APPEND WITH EMAIL
  const formattedDate = new Date(application.createdAt).toLocaleString(
    "en-us",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
  // CONDITIONAL EMAIL SUBJECT & BODY BASED ON STATUS
  let subject = "";
  let html = "";
  // IF STATUS IS ACCEPTED
  if (status === "ACCEPTED") {
    subject = `Congratulations! You are Accepted for the Role ${job.title}`;
    html = `
    <h1>Congratulations ${applicant.fullName}</h1>
    <h3>
      We are pleased to inform you that your Application for the Position of ${job.title} at ${job.company.name} Located in ${job.location} (Applied on ${formattedDate}) has been ACCEPTED.
    </h3>
    <h3>${job.company.name} Hiring Team will Contact you soon with Further Details.</h3>
    <h4>Best Regards<br/>Hiring Team <br/>JobHunt</h4>
  `;
  } else if (status === "REJECTED") {
    subject = `Update Regarding your Application for ${job.title}`;
    html = `
      <h1>Dear Applicant ${applicant.fullName}</h1>
      <h3>
        We regret to inform you that your Application for the Position of ${job.title} at ${job.company.name} Located in ${job.location} (Applied on ${formattedDate}) has been REJECTED.
      </h3>
      <h3>We Appreciate your Interest & Encourage you to apply for Future Openings.</h3>
      <h4>Best Regards<br/>Hiring Team<br/>JobHunt</h4>
    `;
  }
  // MAIL OPTIONS
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: toEmail,
    subject,
    html,
  };
  return sendMailWithRetry(mailOptions);
};

/**
 * SENDS A COMPANY REGISTRATION EMAIL TO THE RECRUITER
 * @param {String} toEmail - Email of the Recruiter Who has Registered Company
 * @param {object} company - The Complete Company Object
 * @param {object} recruiter - The Complete Recruiter Object
 */
// MAILER # 6 : COMPANY REGISTRATION CONFIRMATION EMAIL
export const sendCompanyRegistrationEmail = async (
  toEmail,
  company,
  recruiter
) => {
  // FORMATTING THE DATE TO APPEND WITH EMAIL
  const formattedDate = new Date(company.createdAt).toLocaleString("en-us", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  // SETTING HTML FOR EMAIL BODY
  const html = `
    <h1>Company Registered Successfully!</h1>
    <h2>Dear ${recruiter.fullName}</h2>
    <h3>Your Company ${company.name} was Registered Successfully on ${formattedDate}</h3>
    <h4>Thank You for choosing JobHunt!</h4>
    <h4>Best Regards<br/>JobHunt Team</h4>
  `;
  // MAIL OPTIONS
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: toEmail,
    subject: `Company "${company.name}" Registered Successfully!`,
    html,
  };
  return sendMailWithRetry(mailOptions);
};

/**
 * SENDS A COMPANY UPDATE EMAIL TO THE RECRUITER
 * @param {String} toEmail - Email of the Recruiter Who has Registered the Company
 * @param {object} company - The Complete Company Object
 * @param {object} recruiter - The Complete Recruiter Object
 * @param {String} changesHtml - The Changes that were Made to the Company
 */
// MAILER # 7 : COMPANY UPDATE CONFIRMATION EMAIL
export const sendCompanyUpdateEmail = async (
  toEmail,
  company,
  recruiter,
  changesHtml
) => {
  // FORMATTING THE DATE TO APPEND WITH EMAIL
  const formattedDate = new Date(company.updatedAt).toLocaleString("en-us", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  // SETTING HTML FOR EMAIL BODY
  const html = `
    <h1>Company Details Updated Successfully!</h1>
    <h2>Dear ${recruiter.fullName}</h2>
    <h3>Your Company was Updated on ${formattedDate}</h3>
    <h3>The Following Changes were Made:</h3>
    <h3>${changesHtml}</h3>
    <h4>Thank You for using JobHunt!</h4>
    <h4>Best Regards<br/>JobHunt Team</h4>
  `;
  // MAIL OPTIONS
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: toEmail,
    subject: `Company ${company.name} Updated Successfully!`,
    html,
  };
  return sendMailWithRetry(mailOptions);
};

/**
 * SENDS A COMPANY DELETION EMAIL TO THE RECRUITER
 * @param {String} toEmail - Email of the Recruiter Who Owns the Company
 * @param {object} company - The Complete Company Object
 * @param {object} recruiter - The Complete Recruiter Object
 */
// MAILER # 8 : COMPANY DELETE CONFIRMATION EMAIL
export const sendCompanyDeletionEmail = async (toEmail, company, recruiter) => {
  // FORMATTING THE DATE TO APPEND WITH EMAIL
  const formattedDate = new Date().toLocaleString("en-us", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  // SETTING HTML FOR EMAIL BODY
  const html = `
    <h1>Company Deleted Successfully</h1>
    <h2>Dear ${recruiter.fullName}</h2>
    <h2>Your Company ${company.name} has been Deleted Successfully on ${formattedDate}.</h2>
    <h3>If you believe this was a Mistake, please Contact our Support Team Immediately.</h3>
    <h4>Best Regards<br/>JobHunt Team</h4>
  `;
  // MAIL OPTIONS
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: toEmail,
    subject: `Company ${company.name} Deleted Successfully!`,
    html,
  };
  return sendMailWithRetry(mailOptions);
};

/**
 * SENDS A NEW APPLICATION EMAIL TO THE RECRUITER WHO CREATED THE JOB
 * @param {String} toEmail - Email of the Recruiter Who Created the Job
 * @param {object} recruiter - The Complete Recruiter Object
 * @param {object} applicant - The Complete Applicant Object
 * @param {object} job - The Complete Job Object
 * @param {String} applicationDate - The Date when the Application was Created
 */
// MAILER # 9 : SEND NEW APPLICATION EMAIL
export const sendNewApplicationEmail = async (
  toEmail,
  recruiter,
  applicant,
  job,
  applicationDate
) => {
  // FORMATTING THE DATE TO APPEND WITH EMAIL
  const formattedDate = new Date(applicationDate).toLocaleString("en-us", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  // SETTING HTML FOR EMAIL BODY
  const html = `
    <h1>New Job Application Received</h1>
    <h2>Dear ${recruiter.fullName}</h2>
    <h2>A new Applicant, ${applicant.fullName}, has Applied for the Position of ${job.title} at ${job.company.name} (Located in ${job.location}) on ${formattedDate}.</h2>
    <h3>Please review the Application at your Earliest Convenience.</h3>
    <h4>Best Regards<br/>JobHunt Team</h4>
  `;
  // MAIL OPTIONS
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: toEmail,
    subject: `New Application for ${job.title} Received!`,
    html,
  };
  return sendMailWithRetry(mailOptions);
};

/**
 * SENDS A DELETION VERIFICATION EMAIL TO THE USER
 * @param {String} toEmail - Email of the User Requested Account Deletion
 * @param {object} user - The Complete User Object
 * @param {Number} code - The 6-Digit Code Sent in the Email
 */
// MAILER # 10 : SEND DELETION VERIFICATION EMAIL
export const sendDeletionVerificationEmail = async (toEmail, user, code) => {
  // FORMATTING THE DATE TO APPEND WITH EMAIL
  const formattedDate = new Date().toLocaleString("en-us", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  // SETTING HTML FOR EMAIL BODY
  const html = `
    <h1>Dear ${user.fullName}</h1>
    <h2>You have Requested to Delete Your Account on JobHunt at ${formattedDate}</h2>
    <h2>Please Use the Following 6-Digit Code to Verify your Account Deletion:</h2>
    <h3>${code}</h3>
    <h3>If you have not Requested your Account Deletion, Please Ignore this Email.</h3>
    <h4>Best Regards<br/>JobHunt Team</h4>
  `;
  // MAIL OPTIONS
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: toEmail,
    subject: `Account Deletion Verification for ${user.fullName}`,
    html,
  };
  return sendMailWithRetry(mailOptions);
};

/**
 * SENDS A DELETION VERIFIED EMAIL TO THE USER
 * @param {String} toEmail - Email of the User Requested Account Deletion
 * @param {object} user - The Complete User Object
 */
// MAILER # 11 : SEND DELETION VERIFIED EMAIL
export const sendDeletionVerifiedEmail = async (toEmail, user) => {
  // FORMATTING THE DATE TO APPEND WITH EMAIL
  const formattedDate = new Date().toLocaleString("en-us", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  // SETTING HTML FOR EMAIL BODY
  const html = `
    <h1>Dear ${user.fullName}</h1>
    <h2>Your Account on JobHunt has been Successfully Deleted at ${formattedDate}</h2>
    <h2>We Appreciate the Time you spent with the JobHunt Family. We will look Forward to see you soon.</h2>
    <h3>If you have not Performed this Account Deletion, Please get in touch with JobHunt Support Team ASAP.</h3>
    <h4>Best Regards<br/>JobHunt Team</h4>
  `;
  // MAIL OPTIONS
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: toEmail,
    subject: `Account Deletion Successful for ${user.fullName}`,
    html,
  };
  return sendMailWithRetry(mailOptions);
};

/**
 * SENDS A FORGOT PASSWORD EMAIL WITH CODE TO THE USER
 * @param {String} toEmail - Email of the User Requested Password Reset
 * @param {object} user - The Complete User Object
 * @param {Number} code - The 6-Digit Code Sent in the Email
 */
// MAILER # 12 : SEND FORGOT PASSWORD REQUESTED EMAIL
export const sendForgotPasswordEmail = async (toEmail, user, code) => {
  // FORMATTING THE DATE TO APPEND WITH EMAIL
  const formattedDate = new Date().toLocaleString("en-us", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  // SETTING HTML FOR EMAIL BODY
  const html = `
    <h1>Dear ${user.fullName}</h1>
    <h2>Reset Password Requested for your Account on JobHunt at ${formattedDate}</h2>
    <h2>Your Password Reset Code is:</h2>
    <h2>${code}</h2>
    <h3>This Code will Expire in 15 Minutes</h3>
    <h3>If you did not Requested this Password Reset, you can Ignore this Email.</h3>
    <h4>Best Regards<br/>JobHunt Team</h4>
  `;
  // MAIL OPTIONS
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: toEmail,
    subject: `Password Reset Requested for ${user.fullName}`,
    html,
  };
  return sendMailWithRetry(mailOptions);
};

/**
 * SENDS A PASSWORD RESET SUCCESSFUL EMAIL TO THE USER REQUESTED PASSWORD RESET
 * @param {String} toEmail - Email of the User Requested Password Reset
 * @param {object} user - The Complete User Object
 */
// MAILER # 13 : SEND PASSWORD RESET SUCCESSFUL EMAIL
export const sendPasswordResetSuccessfulEmail = async (toEmail, user) => {
  // FORMATTING THE DATE TO APPEND WITH EMAIL
  const formattedDate = new Date().toLocaleString("en-us", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  // SETTING HTML FOR EMAIL BODY
  const html = `
    <h1>Dear ${user.fullName}</h1>
    <h2>A Password Reset Action has been Performed Successfully at ${formattedDate} for your JobHunt Account</h2>
    <h2>If you did not Performed this Action, Please Contact with our Support Team ASAP</h2>
    <h4>Best Regards<br/>JobHunt Team</h4>
  `;
  // MAIL OPTIONS
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: toEmail,
    subject: `Password Reset Successful for ${user.fullName}`,
    html,
  };
  return sendMailWithRetry(mailOptions);
};

/**
 * SENDS A CHANGE PASSWORD EMAIL WITH CODE TO THE USER
 * @param {String} toEmail - Email of the User Requested Password Change
 * @param {object} user - The Complete User Object
 * @param {Number} code - The 6-Digit Code Sent in the Email
 */
// MAILER # 14 : SEND PASSWORD CHANGE REQUESTED EMAIL
export const sendPasswordChangeEmail = async (toEmail, user, code) => {
  // FORMATTING THE DATE TO APPEND WITH EMAIL
  const formattedDate = new Date().toLocaleString("en-us", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  // SETTING HTML FOR EMAIL BODY
  const html = `
    <h1>Dear ${user.fullName}</h1>
    <h2>Password Change Requested for your Account on JobHunt at ${formattedDate}</h2>
    <h2>Your Password Change Code is:</h2>
    <h2>${code}</h2>
    <h3>This Code will Expire in 15 Minutes</h3>
    <h3>If you did not Requested this Password Reset, you can Ignore this Email.</h3>
    <h4>Best Regards<br/>JobHunt Team</h4>
  `;
  // MAIL OPTIONS
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: toEmail,
    subject: `Password Change Requested for ${user.fullName}`,
    html,
  };
  return sendMailWithRetry(mailOptions);
};

/**
 * SENDS A PASSWORD CHANGE SUCCESSFUL EMAIL TO THE USER REQUESTED PASSWORD CHANGE
 * @param {String} toEmail - Email of the User Requested Password Change
 * @param {object} user - The Complete User Object
 */
// MAILER # 15 : SEND PASSWORD CHANGE SUCCESSFUL EMAIL
export const sendPasswordChangeSuccessfulEmail = async (toEmail, user) => {
  // FORMATTING THE DATE TO APPEND WITH EMAIL
  const formattedDate = new Date().toLocaleString("en-us", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  // SETTING HTML FOR EMAIL BODY
  const html = `
    <h1>Dear ${user.fullName}</h1>
    <h2>A Password Change Action has been Performed Successfully at ${formattedDate} for your JobHunt Account</h2>
    <h2>If you did not Performed this Action, Please Contact with our Support Team ASAP</h2>
    <h4>Best Regards<br/>JobHunt Team</h4>
  `;
  // MAIL OPTIONS
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: toEmail,
    subject: `Password Change Successful for ${user.fullName}`,
    html,
  };
  return sendMailWithRetry(mailOptions);
};

/**
 * SENDS A EMAIL UPDATE REQUESTED EMAIL TO THE USER REQUESTED EMAIL UPDATE
 * @param {String} toEmail - Email of the User Requested Email Update
 * @param {object} user - The Complete User Object
 * @param {object} code - The 6-Digit  Code Sent in the Email
 */
// MAILER # 16 : SEND EMAIL UPDATE REQUESTED EMAIL
export const sendEmailUpdateRequestedEmail = async (toEmail, user, code) => {
  // FORMATTING THE DATE TO APPEND WITH EMAIL
  const formattedDate = new Date().toLocaleString("en-us", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  // SETTING HTML FOR EMAIL BODY
  const html = `
    <h1>Dear ${user.fullName}</h1>
    <h2>Email Update Requested for your Account on JobHunt at ${formattedDate}</h2>
    <h2>In Order to prove your Identity you need to Verify your Existing Email by Using the Confirmation Code Below.</h2>
    <h2>Your Email Update Verification Code is:</h2>
    <h2>${code}</h2>
    <h3>This Code will Expire in 15 Minutes</h3>
    <h3>If you did not Requested this Email Update, you can Ignore this Email.</h3>
    <h4>Best Regards<br/>JobHunt Team</h4>
  `;
  // MAIL OPTIONS
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: toEmail,
    subject: `Email Update Requested for ${user.fullName}`,
    html,
  };
  return sendMailWithRetry(mailOptions);
};

/**
 * SENDS A EMAIL ADD REQUESTED EMAIL TO THE USER REQUESTED EMAIL UPDATE
 * @param {String} toEmail - New Email of the User Requested Email Update
 * @param {object} user - The Complete User Object
 * @param {object} code - The 6-Digit Code Sent in the Email
 */
// MAILER # 17 : SEND NEW EMAIL ADD REQUEST EMAIL
export const sendNewEmailAddRequestEmail = async (toEmail, user, code) => {
  // FORMATTING THE DATE TO APPEND WITH EMAIL
  const formattedDate = new Date().toLocaleString("en-us", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  // SETTING HTML FOR EMAIL BODY
  const html = `
    <h1>Dear ${user.fullName}</h1>
    <h2>Email Add Requested for your Account on JobHunt at ${formattedDate}</h2>
    <h2>In Order to Add this Email to your JobHUnt Account, you need to Verify this Email by Providing the Code below.</h2>
    <h2>Your Email Add Verification Code is:</h2>
    <h2>${code}</h2>
    <h3>This Code will Expire in 15 Minutes</h3>
    <h3>If you did not Requested this Email Add, you can Ignore this Email.</h3>
    <h4>Best Regards<br/>JobHunt Team</h4>
  `;
  // MAIL OPTIONS
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: toEmail,
    subject: `Email Add Requested for ${user.fullName}`,
    html,
  };
  return sendMailWithRetry(mailOptions);
};

/**
 * SENDS A EMAIL UPDATED SUCCESSFUL EMAIL TO THE USER REQUESTED EMAIL CHANGE
 * @param {String} toEmail - Updated Email of the User Requested Email Update
 * @param {object} user - The Complete User Object
 */
// MAILER # 18 : SEND A EMAIL UPDATED SUCCESSFULLY EMAIL
export const sendEmailUpdatedSuccessfulEmail = async (toEmail, user) => {
  // FORMATTING THE DATE TO APPEND WITH EMAIL
  const formattedDate = new Date().toLocaleString("en-us", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  // SETTING HTML FOR EMAIL BODY
  const html = `
    <h1>Dear ${user.fullName}</h1>
    <h2>The Email Update you Requested has been successfully Completed at ${formattedDate}. This Email is now Added as your Account Email.</h2>
    <h3>If you did not Performed this Email Update Process, Please get in touch with our Support Team ASAP.</h3>
    <h4>Best Regards<br/>JobHunt Team</h4>
  `;
  // MAIL OPTIONS
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: toEmail,
    subject: `Email Update Successful for ${user.fullName}`,
    html,
  };
  return sendMailWithRetry(mailOptions);
};

/**
 * SENDS A RESUME UPDATED SUCCESSFULLY TO USER REQUESTED RESUME UPDATE
 * @param {String} toEmail - Email of the User Requested Resume Update
 * @param {object} user - The Complete User Object
 */
// MAILER # 19 : SEND A RESUME UPDATED SUCCESSFULLY EMAIL
export const sendResumeUpdatedEmail = async (toEmail, user) => {
  // FORMATTING THE DATE TO APPEND WITH EMAIL
  const formattedDate = new Date().toLocaleString("en-us", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  // SETTING HTML FOR EMAIL BODY
  const html = `
    <h1>Dear ${user.fullName}</h1>
    <h2>Your Resume was Updated at ${formattedDate} for your JobHunt Account.</h2>
    <h3>If you did not Performed this Resume Update Process, Please get in touch with our Support Team ASAP.</h3>
    <h4>Best Regards<br/>JobHunt Team</h4>
  `;
  // MAIL OPTIONS
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: toEmail,
    subject: `Resume Updated for ${user.fullName}`,
    html,
  };
  return sendMailWithRetry(mailOptions);
};

/**
 * SENDS A EMAIL DELETED SUCCESSFULLY EMAIL TO THE USER REQUESTED RESUME DELETE
 * @param {*} toEmail - Email of the User Requested Resume Delete
 * @param {*} user - The Complete User Object
 */
// MAILER # 20 : SEND A RESUME UPDATED SUCCESSFULLY EMAIL
export const sendResumeDeletedEmail = async (toEmail, user) => {
  // FORMATTING THE DATE TO APPEND WITH EMAIL
  const formattedDate = new Date().toLocaleString("en-us", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  // SETTING HTML FOR EMAIL BODY
  const html = `
    <h1>Dear ${user.fullName}</h1>
    <h2>Your Resume was Deleted at ${formattedDate} for your JobHunt Account.</h2>
    <h3>Make sure to Add a Resume as it helps Recruiters to see your Work.</h3>
    <h3>If you did not Performed this Resume Delete Process, Please get in touch with our Support Team ASAP.</h3>
    <h4>Best Regards<br/>JobHunt Team</h4>
  `;
  // MAIL OPTIONS
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: toEmail,
    subject: `Resume Deleted for ${user.fullName}`,
    html,
  };
  return sendMailWithRetry(mailOptions);
};

/**
 * SENDS A PROFILE UPDATE EMAIL TO THE USER REQUESTED PROFILE UPDATE
 * @param {String} toEmail - Email of the User Requested Update Profile
 * @param {object} user - The Complete User Object
 * @param {string} updatedDate - The Date User was Updated
 * @param {String} changesHtml - The Changes that were Made to the Profile
 */
// MAILER # 21 : SEND USER PROFILE UPDATE CONFIRMATION EMAIL
export const sendUserUpdateEmail = async (
  toEmail,
  user,
  updatedDate,
  changesHtml
) => {
  // FORMATTING THE DATE TO APPEND WITH EMAIL
  const formattedDate = new Date(updatedDate).toLocaleString("en-us", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  // SETTING HTML FOR EMAIL BODY
  const html = `
    <h1>Profile Updated Successfully!</h1>
    <h2>Dear ${user.fullName}</h2>
    <h3>Your Profile was Updated on ${formattedDate}</h3>
    <h3>The Following Changes were Made:</h3>
    <h3>${changesHtml}</h3>
    <h4>Thank You for using JobHunt!</h4>
    <h4>Best Regards<br/>JobHunt Team</h4>
  `;
  // MAIL OPTIONS
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: toEmail,
    subject: `User ${user.fullName} Updated Successfully!`,
    html,
  };
  return sendMailWithRetry(mailOptions);
};

/**
 * SENDS A SUBSCRIPTION SUCCESSFUL EMAIL TO USER SUBSCRIBED
 * @param {String} toEmail - Email of the User Subscribed
 * @param {object} user - The Complete User Object
 * @param {object} company - The Complete Company Object
 */
// MAILER # 22 : SEND SUBSCRIPTION CONFIRMATION EMAIL
export const sendSubscriptionConfirmationEmail = async (
  toEmail,
  user,
  company
) => {
  // FORMATTING THE DATE TO APPEND WITH EMAIL
  const formattedDate = new Date().toLocaleString("en-us", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  // SETTING HTML FOR EMAIL BODY
  const html = `
    <h1>Company Subscription Successful!</h1>
    <h2>Dear ${user.fullName}</h2>
    <h3>You have Successfully Subscribed to Company ${company.name} Newsletter at ${formattedDate}</h3>
    <h3>You will Receive Updated about Job Openings from ${company.name} in the Future.</h3>
    <h4>Thank You Subscribing!</h4>
    <h4>Best Regards<br/>JobHunt Team</h4>
  `;
  // MAIL OPTIONS
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: toEmail,
    subject: `Subscribed to ${company.name} Successfully!`,
    html,
  };
  return sendMailWithRetry(mailOptions);
};

/**
 * SENDS A UNSUBSCRIPTION SUCCESSFUL EMAIL TO USER UNSUBSCRIBED
 * @param {String} toEmail - Email of the User Unsubscribed
 * @param {object} user - The Complete User Object
 * @param {object} company - The Complete Company Object
 * @returns
 */
// MAILER # 23 : SEND UNSUBSCRIPTION CONFIRMATION EMAIL
export const sendUnsubscriptionConfirmationEmail = async (
  toEmail,
  user,
  company
) => {
  // FORMATTING THE DATE TO APPEND WITH EMAIL
  const formattedDate = new Date().toLocaleString("en-us", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  // SETTING HTML FOR EMAIL BODY
  const html = `
    <h1>Company Unsubscription Successful!</h1>
    <h2>Dear ${user.fullName}</h2>
    <h3>You have Successfully Unsubscribed from Company ${company.name} Newsletter at ${formattedDate}</h3>
    <h3>You will no longer Receive Updates about New Job Openings from ${company.name}.</h3>
    <h4>Thank You for using JobHunt!</h4>
    <h4>Best Regards<br/>JobHunt Team</h4>
  `;
  // MAIL OPTIONS
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: toEmail,
    subject: `Unsubscribed from ${company.name} Successfully!`,
    html,
  };
  return sendMailWithRetry(mailOptions);
};

/**
 * SENDS A NEW SUBSCRIBER ADDED EMAIL TO THE COMPANY OWNER
 * @param {String} toEmail - Email of the Company Owner
 * @param {String} owner - The Owner Name
 * @param {String} subscriber - The Subscriber Name
 * @param {String} companyName - The Company Name
 */
// MAILER # 24 : SEND A NEW SUBSCRIBER ADDED EMAIL
export const sendNewSubscriberAddedEmail = async (
  toEmail,
  owner,
  subscriber,
  companyName
) => {
  // FORMATTING THE DATE TO APPEND WITH EMAIL
  const formattedDate = new Date().toLocaleString("en-us", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  // SETTING HTML FOR EMAIL BODY
  const html = `
    <h1>New Subscriber Notification</h1>
    <h2>Dear ${owner}</h2>
    <h3>${subscriber} just Subscribed to your Company ${companyName} at ${formattedDate}</h3>
    <h3>Please Check your Dashboard for more Details</h3>
    <h4>Best Regards<br/>JobHunt Team</h4>
  `;
  // MAIL OPTIONS
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: toEmail,
    subject: `New Subscriber for ${companyName}`,
    html,
  };
  return sendMailWithRetry(mailOptions);
};

/**
 * SENDS AN EMAIL TO ALL SUBSCRIBERS OF THE COMPANY
 * @param {object} company - The Complete Company Object
 * @param {object} job - The Complete Job Object
 */
// MAILER # 25 : SEND NEW JOB EMAIL
export const sendNewJobPostedEmailToSubscribers = async (company, job) => {
  // CHECKING IF THERE ARE ANY SUBSCRIBERS FOR THE COMPANY
  if (!company.subscribers || company.subscribers.length === 0) {
    console.log("No Subscribers for the Company : ", company.name);
    return;
  }
  // FORMATTING THE DATE TO APPEND WITH EMAIL
  const formattedDate = new Date(job.createdAt).toLocaleString("en-us", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  // BUILDING AN ARRAY OF PROMISES FOR EACH SUBSCRIBER EMAIL
  const emailPromises = company.subscribers.map((subscriber) => {
    // SETTING HTML FOR EMAIL BODY
    const html = `
      <h2>New Job Opportunity for you at ${company.name}</h2>
      <h1>Dear ${subscriber.fullName}</h1>
      <h3>A New Job has been Posted at ${formattedDate} for the Position of ${job.title} at ${company.name} Located at ${job.location}</h3>
      <h3>Visit JobHunt to Check if it's the Job you were Looking for.</h3>
      <h4>Best Regards<br/>JobHunt Team</h4>
    `;
    // MAIL OPTIONS
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: subscriber.email,
      subject: `${company.name} Newsletter : New Job ${job.title} Posted!`,
      html,
    };
    return sendMailWithRetry(mailOptions);
  });
  // SENDING ALL EMAILS CONCURRENTLY
  try {
    await Promise.all(emailPromises);
  } catch (error) {
    console.error("Error Sending Mails to Subscribers", error);
  }
};

/**
 * SENDS A NEW JOB POSTED EMAIL TO THE COMPANY OWNER
 * @param {object} company - The Complete Company Oject
 * @param {object} job - The Complete Job Object
 * @param {object} owner - The Complete Owner Object
 */
// MAILER # 26 : SEND NEW JOB POSTED EMAIL
export const sendNewJobPostedEmailToOwner = async (company, job, owner) => {
  // FORMATTING THE DATE TO APPEND WITH EMAIL
  const formattedDate = new Date(job.createdAt).toLocaleString("en-us", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  // SETTING HTML FOR EMAIL BODY
  const html = `
    <h1>New Job Posted Successfully!</h1>
    <h2>Dear ${owner.fullName}</h2>
    <h3>A new Job for the Position of ${job.title} Located in ${job.location} at Company ${company.name} has been Posted at ${formattedDate}</h3>
    <h3>Thank You for Using JobHunt!</h3>
    <h4>Best Regards<br/>JobHunt Team</h4>
  `;
  // MAIL OPTIONS
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: owner.email,
    subject: `New Job Posted at ${company.name}`,
    html,
  };
  return sendMailWithRetry(mailOptions);
};

/**
 * SENDS A NEW APPLICANT HIRED EMAIL TO THE RECRUITER
 * @param {String} toEmail - Email of the Recruiter Who Created the Job
 * @param {object} job - The Complete Job Object
 * @param {object} application - The Complete Application Object
 * @param {object} recruiter - The Complete Recruiter Object
 */
// MAILER # 27 : SEND A NEW APPLICANT HIRED EMAIL
export const sendNewApplicantHiredEmail = async (
  toEmail,
  job,
  application,
  recruiter
) => {
  // FORMATTING THE DATE TO APPEND WITH EMAIL
  const formattedDate = new Date(application.updatedAt).toLocaleString(
    "en-us",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
  // SETTING HTML FOR EMAIL BODY
  const html = `
    <h1>New Hiring ${application.applicant.fullName}</h1>
    <h2>Dear ${recruiter.fullName}</h2>
    <h3>Congratulations on your new Hiring ${application.applicant.fullName} for the Position of ${job.title} Located at ${job.location} in your Company ${job.company.name} on ${formattedDate}</h3>
    <h3>We hope ${application.applicant.fullName} is a Good Match and you achieve lots of Success together. We Wish you Best of Luck for your Future.</h3>
    <h3>Thank You for Using JobHunt!</h3>
    <h4>Best Regards<br/>JobHunt Team</h4>
  `;
  // MAIL OPTIONS
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: toEmail,
    subject: `New Hiring ${application.applicant.fullName} at ${job.company.name}`,
    html,
  };
  return sendMailWithRetry(mailOptions);
};

/**
 * SENDS A 2FA REQUESTED EMAIL TO USER WHO REQUESTED TO ENABLE 2FA
 * @param {String} toEmail - Email of the User Requested to Enable 2FA
 * @param {object} user - The Complete User Object
 * @param {Number} code - The 6-Digit Code Sent in the Email
 */
// MAILER # 28 : SEND A 2FA REQUESTED EMAIL
export const send2FARequestedEmail = async (toEmail, user, code) => {
  // FORMATTING THE DATE TO APPEND WITH EMAIL
  const formattedDate = new Date().toLocaleString("en-us", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  // SETTING HTML FOR EMAIL BODY
  const html = `
    <h1>Dear ${user.fullName}</h1>
    <h2>Two Factor Authentication (2FA) Activation for your Account at JobHunt was Requested at ${formattedDate}</h2>
    <h2>In Order to Enable 2FA, you need to Verify your Email first by entering the 6-Digit Code Below:</h2>
    <h3>This is your Verification Code:</h3>
    <h3>${code}</h3>
    <h3>This Code will Expire in 15 Minutes</h3>
    <h3>If you did not requested this 2FA Activation, you can Ignore this Email.</h3>
    <h4>Best Regards<br/>JobHunt Team</h4>
  `;
  // MAIL OPTIONS
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: toEmail,
    subject: `Two Factor Authentication (2FA) Requested for ${user.fullName}`,
    html,
  };
  return sendMailWithRetry(mailOptions);
};

/**
 * SENDS A 2FA REQUESTED EMAIL SUCCESSFUL EMAIL TO USER REQUESTED 2FA ACTIVATION
 * @param {String} toEmail - Email of the User Requested 2FA Activation
 * @param {object} user - The Complete User Object
 */
// MAILER # 29 : SEND A 2FA REQUEST VERIFIED EMAIL
export const send2FARequestVerifiedEmail = async (toEmail, user) => {
  // FORMATTING THE DATE TO APPEND WITH EMAIL
  const formattedDate = new Date().toLocaleString("en-us", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  // SETTING HTML FOR EMAIL BODY
  const html = `
    <h1>Dear ${user.fullName}</h1>
    <h2>Two Factor Authentication (2FA) Activation for your Account at JobHunt was Requested, that has been Successfully Verified at ${formattedDate}</h2>
    <h2>In Order to Enable 2FA, you need to Scan the QR Code and enter the 6-Digit Code in the Window Opened.</h2>
    <h4>Best Regards<br/>JobHunt Team</h4>
  `;
  // MAIL OPTIONS
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: toEmail,
    subject: `Two Factor Authentication (2FA) Request Successful for ${user.fullName}`,
    html,
  };
  return sendMailWithRetry(mailOptions);
};

/**
 * SENDS A 2FA ENABLED SUCCESSFULLY EMAIL TO USER REQUESTED 2FA ACTIVATION
 * @param {String} toEmail - Email of the User Requested 2FA Activation
 * @param {object} user - The Complete User Object
 */
// MAILER # 30 : SEND A 2FA SUCCESSFULLY ENABLED EMAIL
export const send2FAEnabledEmail = async (toEmail, user) => {
  // FORMATTING THE DATE TO APPEND WITH EMAIL
  const formattedDate = new Date().toLocaleString("en-us", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  // SETTING HTML FOR EMAIL BODY
  const html = `
    <h1>Dear ${user.fullName}</h1>
    <h2>Two Factor Authentication (2FA) Activation for your Account at JobHunt was Requested that has been Successfully Completed at ${formattedDate}.</h2>
    <h2>If you did not Performed this 2FA Activation, Please Contact with our Support Team ASAP.</h2>
    <h4>Best Regards<br/>JobHunt Team</h4>
  `;
  // MAIL OPTIONS
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: toEmail,
    subject: `Two Factor Authentication (2FA) Enabled Successfully for ${user.fullName}`,
    html,
  };
  return sendMailWithRetry(mailOptions);
};

/**
 * SENDS A 2FA REQUESTED EMAIL TO USER WHO REQUESTED TO DISABLE 2FA
 * @param {String} toEmail - Email of the User Requested to Disable 2FA
 * @param {object} user - The Complete User Object
 * @param {Number} code - The 6-Digit Code Sent in the Email
 */
// MAILER # 31 : SEND A 2FA DISABLE REQUESTED EMAIL
export const send2FADisableRequestedEmail = async (toEmail, user, code) => {
  // FORMATTING THE DATE TO APPEND WITH EMAIL
  const formattedDate = new Date().toLocaleString("en-us", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  // SETTING HTML FOR EMAIL BODY
  const html = `
    <h1>Dear ${user.fullName}</h1>
    <h2>Two Factor Authentication (2FA) De-Activation for your Account at JobHunt was Requested at ${formattedDate}</h2>
    <h2>In Order to Disable 2FA, you need to Verify your Email first by entering the 6-Digit Code Below:</h2>
    <h3>This is your Verification Code:</h3>
    <h3>${code}</h3>
    <h3>This Code will Expire in 15 Minutes</h3>
    <h3>If you did not requested this 2FA De-Activation, you can Ignore this Email.</h3>
    <h4>Best Regards<br/>JobHunt Team</h4>
  `;
  // MAIL OPTIONS
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: toEmail,
    subject: `Two Factor Authentication (2FA) Disable Requested for ${user.fullName}`,
    html,
  };
  return sendMailWithRetry(mailOptions);
};

/**
 * SENDS A 2FA REQUESTED EMAIL SUCCESSFUL EMAIL TO USER REQUESTED 2FA DE-ACTIVATION
 * @param {String} toEmail - Email of the User Requested 2FA De-Activation
 * @param {object} user - The Complete User Object
 */
// MAILER # 32 : SEND A 2FA DISABLE REQUEST VERIFIED EMAIL
export const send2FADisableRequestVerifiedEmail = async (toEmail, user) => {
  // FORMATTING THE DATE TO APPEND WITH EMAIL
  const formattedDate = new Date().toLocaleString("en-us", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  // SETTING HTML FOR EMAIL BODY
  const html = `
    <h1>Dear ${user.fullName}</h1>
    <h2>Two Factor Authentication (2FA) De-Activation for your Account at JobHunt was Requested, that has been Successfully Verified at ${formattedDate}</h2>
    <h2>In Order to Disable 2FA, you need to enter the 6-Digit Code from your Authenticator App in the Window Opened.</h2>
    <h4>Best Regards<br/>JobHunt Team</h4>
  `;
  // MAIL OPTIONS
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: toEmail,
    subject: `Two Factor Authentication (2FA) Disable Request Successful for ${user.fullName}`,
    html,
  };
  return sendMailWithRetry(mailOptions);
};

/**
 * SENDS A 2FA DISABLED SUCCESSFULLY EMAIL TO USER REQUESTED 2FA DE-ACTIVATION
 * @param {String} toEmail - Email of the User Requested 2FA De-Activation
 * @param {object} user - The Complete User Object
 */
// MAILER # 33 : SEND A 2FA SUCCESSFULLY DISABLED EMAIL
export const send2FADisabledEmail = async (toEmail, user) => {
  // FORMATTING THE DATE TO APPEND WITH EMAIL
  const formattedDate = new Date().toLocaleString("en-us", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  // SETTING HTML FOR EMAIL BODY
  const html = `
    <h1>Dear ${user.fullName}</h1>
    <h2>Two Factor Authentication (2FA) De-Activation for your Account at JobHunt was Requested that has been Successfully Completed at ${formattedDate}.</h2>
    <h2>If you did not Performed this 2FA De-Activation, Please Contact with our Support Team ASAP.</h2>
    <h4>Best Regards<br/>JobHunt Team</h4>
  `;
  // MAIL OPTIONS
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: toEmail,
    subject: `Two Factor Authentication (2FA) Disabled Successfully for ${user.fullName}`,
    html,
  };
  return sendMailWithRetry(mailOptions);
};
