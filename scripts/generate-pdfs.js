const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function generatePDF(htmlContent, outputPath) {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  await page.pdf({
    path: outputPath,
    format: 'A4',
    margin: { top: '20mm', bottom: '20mm', left: '20mm', right: '20mm' },
    printBackground: true
  });
  await browser.close();
  console.log('Generated:', outputPath);
}

const userGuideHTML = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Libre+Franklin:wght@400;500;600&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Libre Franklin', sans-serif;
    color: #1a3a2a;
    font-size: 11pt;
    line-height: 1.6;
  }

  .cover {
    background: #f8f4ec;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 60px;
    page-break-after: always;
  }

  .cover-logo {
    width: 80px; height: 80px;
    background: #1a3a2a;
    border-radius: 16px;
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 32px;
    font-family: 'Playfair Display', serif;
    font-size: 28px;
    color: #c8a060;
    font-weight: 700;
  }

  .cover h1 {
    font-family: 'Playfair Display', serif;
    font-size: 42pt;
    color: #1a3a2a;
    margin-bottom: 12px;
  }

  .cover h2 {
    font-family: 'Libre Franklin', sans-serif;
    font-size: 14pt;
    color: #666;
    font-weight: 400;
    margin-bottom: 8px;
  }

  .cover .date {
    font-size: 11pt;
    color: #999;
    margin-top: 48px;
  }

  .cover .gold-rule {
    width: 60px; height: 3px;
    background: #c8a060;
    margin: 24px auto;
  }

  .page-header {
    background: #1a3a2a;
    color: white;
    padding: 10px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: -20mm -20mm 20px;
    font-size: 9pt;
  }

  .page-header .brand {
    font-family: 'Playfair Display', serif;
    font-size: 11pt;
  }

  .chapter {
    page-break-before: always;
    padding-top: 10px;
  }

  .chapter-label {
    font-size: 9pt;
    color: #c8a060;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 6px;
    font-weight: 500;
  }

  h2.chapter-title {
    font-family: 'Playfair Display', serif;
    font-size: 24pt;
    color: #1a3a2a;
    margin-bottom: 8px;
  }

  .gold-rule {
    height: 2px;
    background: #c8a060;
    margin: 12px 0 20px;
  }

  .chapter-desc {
    font-size: 11pt;
    color: #555;
    margin-bottom: 24px;
  }

  h3 {
    font-family: 'Playfair Display', serif;
    font-size: 14pt;
    color: #1a3a2a;
    margin: 20px 0 12px;
  }

  .steps { margin-bottom: 24px; }

  .step {
    display: flex;
    gap: 14px;
    align-items: flex-start;
    margin-bottom: 12px;
  }

  .step-num {
    width: 24px; height: 24px;
    border-radius: 50%;
    background: #c8a060;
    color: #1a3a2a;
    font-size: 10pt;
    font-weight: 600;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    margin-top: 1px;
  }

  .step-text { font-size: 11pt; color: #333; line-height: 1.5; }

  .score-grid {
    background: #f8f4ec;
    border-radius: 8px;
    padding: 16px 20px;
    margin: 16px 0;
  }

  .score-item {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    border-bottom: 0.5px solid #e0d8c8;
    font-size: 10.5pt;
  }

  .score-item:last-child { border-bottom: none; }
  .score-pts { color: #c8a060; font-weight: 600; }

  .faq { margin-top: 24px; }

  .faq-item { margin-bottom: 16px; }

  .faq-q {
    font-weight: 600;
    color: #1a3a2a;
    font-size: 10.5pt;
    margin-bottom: 4px;
  }

  .faq-a {
    color: #555;
    font-size: 10.5pt;
    padding-left: 16px;
    line-height: 1.5;
  }

  .toc {
    page-break-after: always;
    padding-top: 10px;
  }

  .toc-item {
    display: flex;
    justify-content: space-between;
    padding: 10px 0;
    border-bottom: 0.5px solid #e0d8c8;
    font-size: 11pt;
  }

  .toc-num { color: #c8a060; font-weight: 600; margin-right: 12px; }

  .key-guidance {
    background: #f8f4ec;
    border-left: 3px solid #c8a060;
    padding: 16px 20px;
    margin: 16px 0;
    border-radius: 0 8px 8px 0;
  }

  .key-guidance h4 {
    font-weight: 600;
    color: #1a3a2a;
    margin-bottom: 6px;
    font-size: 11pt;
  }

  .key-guidance p {
    color: #555;
    font-size: 10.5pt;
    line-height: 1.5;
  }
</style>
</head>
<body>

<div class="cover">
  <div class="cover-logo">AP</div>
  <h1>User Guide</h1>
  <div class="gold-rule"></div>
  <h2>End User Edition &mdash; Pilot Version 1.0</h2>
  <p class="date">June 2026</p>
</div>

<div class="toc">
  <div class="page-header">
    <span class="brand">AiForm Procure</span>
    <span>User Guide</span>
  </div>
  <div class="chapter-label">Contents</div>
  <h2 class="chapter-title">Table of Contents</h2>
  <div class="gold-rule"></div>
  <div class="toc-item"><span><span class="toc-num">1</span>Getting Started</span></div>
  <div class="toc-item"><span><span class="toc-num">2</span>Your Profile</span></div>
  <div class="toc-item"><span><span class="toc-num">3</span>Supplier Documents</span></div>
  <div class="toc-item"><span><span class="toc-num">4</span>SmartScore</span></div>
  <div class="toc-item"><span><span class="toc-num">5</span>RFQs and Quoting</span></div>
  <div class="toc-item"><span><span class="toc-num">6</span>Procurement Wire</span></div>
  <div class="toc-item"><span><span class="toc-num">7</span>Thuso AI Assistant</span></div>
  <div class="toc-item"><span><span class="toc-num">8</span>FAQs and Troubleshooting</span></div>
</div>

<div class="chapter">
  <div class="page-header"><span class="brand">AiForm Procure</span><span>User Guide</span></div>
  <div class="chapter-label">Chapter 1</div>
  <h2 class="chapter-title">Getting Started</h2>
  <div class="gold-rule"></div>
  <p class="chapter-desc">Registration, phone OTP verification, and choosing your role.</p>
  <h3>Steps</h3>
  <div class="steps">
    <div class="step"><div class="step-num">1</div><div class="step-text">Go to the AiForm Procure platform and click Sign Up</div></div>
    <div class="step"><div class="step-num">2</div><div class="step-text">Enter your business email address and create a secure password (minimum 8 characters, must include uppercase, lowercase, and a number)</div></div>
    <div class="step"><div class="step-num">3</div><div class="step-text">Select your role: Supplier or Buyer</div></div>
    <div class="step"><div class="step-num">4</div><div class="step-text">Enter your South African mobile number &mdash; a 6-digit OTP will be sent via SMS</div></div>
    <div class="step"><div class="step-num">5</div><div class="step-text">Enter the OTP within 10 minutes to verify your account</div></div>
    <div class="step"><div class="step-num">6</div><div class="step-text">Complete your business profile to activate your account fully</div></div>
  </div>
  <h3>Frequently Asked Questions</h3>
  <div class="faq">
    <div class="faq-item"><div class="faq-q">I did not receive my OTP &mdash; what do I do?</div><div class="faq-a">Wait 60 seconds and click Resend code. Check that your number is in +27 format. If the issue persists, contact support.</div></div>
    <div class="faq-item"><div class="faq-q">Can I sign up with Google or Microsoft?</div><div class="faq-a">Yes &mdash; click Continue with Google or Continue with Microsoft on the login page. Phone verification is not required for OAuth sign-ins.</div></div>
    <div class="faq-item"><div class="faq-q">I forgot my password &mdash; how do I reset it?</div><div class="faq-a">Click Forgot password on the login page. A reset link will be sent to your email address.</div></div>
  </div>
</div>

<div class="chapter">
  <div class="page-header"><span class="brand">AiForm Procure</span><span>User Guide</span></div>
  <div class="chapter-label">Chapter 2</div>
  <h2 class="chapter-title">Your Profile</h2>
  <div class="gold-rule"></div>
  <p class="chapter-desc">Complete your business profile, company logo, and cover photo.</p>
  <h3>Steps</h3>
  <div class="steps">
    <div class="step"><div class="step-num">1</div><div class="step-text">Open Dashboard and go to Business profile</div></div>
    <div class="step"><div class="step-num">2</div><div class="step-text">Add your registered business name, industry, province, phone number, and website</div></div>
    <div class="step"><div class="step-num">3</div><div class="step-text">Upload a company logo and cover photo for your public supplier profile</div></div>
    <div class="step"><div class="step-num">4</div><div class="step-text">Save your changes and review the profile preview</div></div>
  </div>
  <div class="key-guidance">
    <h4>Profile quality</h4>
    <p>A complete profile gives buyers confidence and improves your visibility when procurement teams search supplier records.</p>
  </div>
  <div class="key-guidance">
    <h4>Images</h4>
    <p>Use a clear logo and professional cover image so your business stands out in supplier directories and buyer shortlists.</p>
  </div>
  <h3>Frequently Asked Questions</h3>
  <div class="faq">
    <div class="faq-item"><div class="faq-q">Do I need a company logo?</div><div class="faq-a">Not mandatory, but it helps significantly. Buyers are more likely to consider suppliers with complete profiles.</div></div>
    <div class="faq-item"><div class="faq-q">Can I change my business details at any time?</div><div class="faq-a">Yes &mdash; go to Dashboard, then Business profile, and click Edit any time.</div></div>
  </div>
</div>

<div class="chapter">
  <div class="page-header"><span class="brand">AiForm Procure</span><span>User Guide</span></div>
  <div class="chapter-label">Chapter 3</div>
  <h2 class="chapter-title">Supplier Documents</h2>
  <div class="gold-rule"></div>
  <p class="chapter-desc">Upload CSD, tax clearance, BBBEE certificate, and banking details.</p>
  <h3>Steps</h3>
  <div class="steps">
    <div class="step"><div class="step-num">1</div><div class="step-text">Go to Dashboard, then Business profile, then Documents</div></div>
    <div class="step"><div class="step-num">2</div><div class="step-text">Upload your tax clearance certificate from SARS</div></div>
    <div class="step"><div class="step-num">3</div><div class="step-text">Upload your BBBEE certificate</div></div>
    <div class="step"><div class="step-num">4</div><div class="step-text">Enter your banking details and director contact information</div></div>
    <div class="step"><div class="step-num">5</div><div class="step-text">Save &mdash; your SmartScore will update automatically</div></div>
  </div>
  <h3>Frequently Asked Questions</h3>
  <div class="faq">
    <div class="faq-item"><div class="faq-q">Which documents are required?</div><div class="faq-a">Tax clearance certificate, BBBEE certificate, banking confirmation, and CSD number. The CSD number is required for verification.</div></div>
    <div class="faq-item"><div class="faq-q">Are my documents secure?</div><div class="faq-a">Yes &mdash; documents are only visible to authorised institutions and are not stored outside the platform.</div></div>
  </div>
</div>

<div class="chapter">
  <div class="page-header"><span class="brand">AiForm Procure</span><span>User Guide</span></div>
  <div class="chapter-label">Chapter 4</div>
  <h2 class="chapter-title">SmartScore</h2>
  <div class="gold-rule"></div>
  <p class="chapter-desc">How scoring works, how to improve it, and what buyers see.</p>
  <h3>How SmartScore works</h3>
  <p style="color:#555; margin-bottom:16px;">SmartScore is a 0-100 rating that shows buyers how complete and trustworthy your supplier profile is. It is calculated automatically when your profile is updated.</p>
  <h3>Score breakdown</h3>
  <div class="score-grid">
    <div class="score-item"><span>Business profile complete</span><span class="score-pts">20 pts</span></div>
    <div class="score-item"><span>CSD number verified</span><span class="score-pts">20 pts</span></div>
    <div class="score-item"><span>Tax clearance uploaded</span><span class="score-pts">15 pts</span></div>
    <div class="score-item"><span>BBBEE certificate uploaded</span><span class="score-pts">15 pts</span></div>
    <div class="score-item"><span>Banking details uploaded</span><span class="score-pts">15 pts</span></div>
    <div class="score-item"><span>Director information</span><span class="score-pts">10 pts</span></div>
    <div class="score-item"><span>Profile photo</span><span class="score-pts">5 pts</span></div>
  </div>
  <h3>Frequently Asked Questions</h3>
  <div class="faq">
    <div class="faq-item"><div class="faq-q">Why is my SmartScore 0?</div><div class="faq-a">Your score is calculated when your profile is saved. Complete your business profile and upload your documents to increase it.</div></div>
    <div class="faq-item"><div class="faq-q">Do buyers see my SmartScore?</div><div class="faq-a">Yes &mdash; your SmartScore is visible on your public supplier profile and in search results.</div></div>
  </div>
</div>

<div class="chapter">
  <div class="page-header"><span class="brand">AiForm Procure</span><span>User Guide</span></div>
  <div class="chapter-label">Chapter 5</div>
  <h2 class="chapter-title">RFQs and Quoting</h2>
  <div class="gold-rule"></div>
  <p class="chapter-desc">Find RFQs, submit quotes, and track status.</p>
  <h3>Steps</h3>
  <div class="steps">
    <div class="step"><div class="step-num">1</div><div class="step-text">Go to Dashboard then RFQs</div></div>
    <div class="step"><div class="step-num">2</div><div class="step-text">Browse open RFQs relevant to your business</div></div>
    <div class="step"><div class="step-num">3</div><div class="step-text">Click on an RFQ to view full requirements</div></div>
    <div class="step"><div class="step-num">4</div><div class="step-text">Click Submit quote and fill in the quote form</div></div>
    <div class="step"><div class="step-num">5</div><div class="step-text">Upload required documents and enter your price</div></div>
    <div class="step"><div class="step-num">6</div><div class="step-text">Submit and wait for a response from the buyer</div></div>
  </div>
  <h3>Frequently Asked Questions</h3>
  <div class="faq">
    <div class="faq-item"><div class="faq-q">How many RFQs can I see?</div><div class="faq-a">All verified suppliers can see and respond to all open RFQs matching their industries.</div></div>
    <div class="faq-item"><div class="faq-q">Can I change my quote after submitting?</div><div class="faq-a">No &mdash; once a quote is submitted it cannot be changed. Contact support if an amendment is needed.</div></div>
  </div>
</div>

<div class="chapter">
  <div class="page-header"><span class="brand">AiForm Procure</span><span>User Guide</span></div>
  <div class="chapter-label">Chapter 6</div>
  <h2 class="chapter-title">Procurement Wire</h2>
  <div class="gold-rule"></div>
  <p class="chapter-desc">What it is, how to use it, and viewing opportunities.</p>
  <h3>Steps</h3>
  <div class="steps">
    <div class="step"><div class="step-num">1</div><div class="step-text">Click the Procurement Wire button at the bottom of the screen</div></div>
    <div class="step"><div class="step-num">2</div><div class="step-text">Browse the latest procurement opportunity notices</div></div>
    <div class="step"><div class="step-num">3</div><div class="step-text">Click a notice to view full details</div></div>
    <div class="step"><div class="step-num">4</div><div class="step-text">Follow relevant opportunities to stay informed</div></div>
  </div>
  <h3>Frequently Asked Questions</h3>
  <div class="faq">
    <div class="faq-item"><div class="faq-q">Is Procurement Wire available to all users?</div><div class="faq-a">Yes &mdash; Procurement Wire is available to all logged-in suppliers and buyers.</div></div>
    <div class="faq-item"><div class="faq-q">How often are notices updated?</div><div class="faq-a">New notices can be added at any time as new opportunities arise.</div></div>
  </div>
</div>

<div class="chapter">
  <div class="page-header"><span class="brand">AiForm Procure</span><span>User Guide</span></div>
  <div class="chapter-label">Chapter 7</div>
  <h2 class="chapter-title">Thuso AI Assistant</h2>
  <div class="gold-rule"></div>
  <p class="chapter-desc">How to use Thuso, what it can help with, and its limitations.</p>
  <h3>Steps</h3>
  <div class="steps">
    <div class="step"><div class="step-num">1</div><div class="step-text">Click the Thuso button (chat icon) in the bottom right corner</div></div>
    <div class="step"><div class="step-num">2</div><div class="step-text">Type your question or describe your problem</div></div>
    <div class="step"><div class="step-num">3</div><div class="step-text">Thuso will respond with relevant platform information</div></div>
    <div class="step"><div class="step-num">4</div><div class="step-text">Use the suggested cards to start a conversation</div></div>
  </div>
  <h3>Frequently Asked Questions</h3>
  <div class="faq">
    <div class="faq-item"><div class="faq-q">What can Thuso do?</div><div class="faq-a">Thuso can help with profile questions, understanding your SmartScore, finding RFQs, and general platform issues.</div></div>
    <div class="faq-item"><div class="faq-q">Is Thuso intelligent?</div><div class="faq-a">Yes &mdash; Thuso uses AI to answer questions. It cannot make verification decisions or change profile data.</div></div>
  </div>
</div>

<div class="chapter">
  <div class="page-header"><span class="brand">AiForm Procure</span><span>User Guide</span></div>
  <div class="chapter-label">Chapter 8</div>
  <h2 class="chapter-title">FAQs and Troubleshooting</h2>
  <div class="gold-rule"></div>
  <p class="chapter-desc">Common issues, error messages, and contact support.</p>
  <h3>Steps</h3>
  <div class="steps">
    <div class="step"><div class="step-num">1</div><div class="step-text">Search this Help Centre first</div></div>
    <div class="step"><div class="step-num">2</div><div class="step-text">Check your internet connection and reload the page</div></div>
    <div class="step"><div class="step-num">3</div><div class="step-text">Confirm that required fields are complete and documents uploaded</div></div>
    <div class="step"><div class="step-num">4</div><div class="step-text">Contact support with your email, business name, page, and exact error message</div></div>
  </div>
  <h3>Frequently Asked Questions</h3>
  <div class="faq">
    <div class="faq-item"><div class="faq-q">The platform is not working properly &mdash; what do I do?</div><div class="faq-a">Try clearing your browser cache and reloading the page. If the issue persists, contact support at support@aiformprocure.co.za</div></div>
    <div class="faq-item"><div class="faq-q">I want to change my email &mdash; how do I do it?</div><div class="faq-a">Go to Dashboard, then Settings, then Account and click Change email. You will need to confirm the new email address.</div></div>
    <div class="faq-item"><div class="faq-q">How do I delete my account?</div><div class="faq-a">Go to Dashboard, then Settings, then Account, then Delete account. Your data will be kept for 30 days before permanent deletion.</div></div>
  </div>
</div>

</body>
</html>
`;

const adminGuideHTML = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Libre+Franklin:wght@400;500;600&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Libre Franklin', sans-serif; color: #1a3a2a; font-size: 11pt; line-height: 1.6; }
  .cover { background: #1a3a2a; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 60px; page-break-after: always; }
  .cover h1 { font-family: 'Playfair Display', serif; font-size: 42pt; color: #f8f4ec; margin-bottom: 12px; }
  .cover h2 { font-size: 13pt; color: #c8a060; font-weight: 400; margin-bottom: 8px; }
  .cover .date { font-size: 11pt; color: #5DCAA5; margin-top: 48px; }
  .cover .gold-rule { width: 60px; height: 3px; background: #c8a060; margin: 24px auto; }
  .cover .confidential { font-size: 9pt; color: #c8a060; letter-spacing: 0.15em; text-transform: uppercase; margin-top: 16px; }
  .page-header { background: #1a3a2a; color: white; padding: 10px 20px; display: flex; justify-content: space-between; align-items: center; margin: -20mm -20mm 20px; font-size: 9pt; }
  .page-header .brand { font-family: 'Playfair Display', serif; font-size: 11pt; }
  .chapter { page-break-before: always; padding-top: 10px; }
  .chapter-label { font-size: 9pt; color: #c8a060; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 6px; font-weight: 500; }
  h2.chapter-title { font-family: 'Playfair Display', serif; font-size: 24pt; color: #1a3a2a; margin-bottom: 8px; }
  .gold-rule { height: 2px; background: #c8a060; margin: 12px 0 20px; }
  .chapter-desc { font-size: 11pt; color: #555; margin-bottom: 24px; }
  h3 { font-family: 'Playfair Display', serif; font-size: 14pt; color: #1a3a2a; margin: 20px 0 12px; }
  .steps { margin-bottom: 24px; }
  .step { display: flex; gap: 14px; align-items: flex-start; margin-bottom: 12px; }
  .step-num { width: 24px; height: 24px; border-radius: 50%; background: #c8a060; color: #1a3a2a; font-size: 10pt; font-weight: 600; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
  .step-text { font-size: 11pt; color: #333; line-height: 1.5; }
  .faq { margin-top: 24px; }
  .faq-item { margin-bottom: 16px; }
  .faq-q { font-weight: 600; color: #1a3a2a; font-size: 10.5pt; margin-bottom: 4px; }
  .faq-a { color: #555; font-size: 10.5pt; padding-left: 16px; line-height: 1.5; }
  .toc { page-break-after: always; padding-top: 10px; }
  .toc-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 0.5px solid #e0d8c8; font-size: 11pt; }
  .toc-num { color: #c8a060; font-weight: 600; margin-right: 12px; }
  .info-box { background: #f8f4ec; border-left: 3px solid #c8a060; padding: 16px 20px; margin: 16px 0; border-radius: 0 8px 8px 0; }
  .info-box h4 { font-weight: 600; color: #1a3a2a; margin-bottom: 6px; font-size: 11pt; }
  .info-box p, .info-box li { color: #555; font-size: 10.5pt; line-height: 1.5; }
  .info-box ul { padding-left: 16px; }
  .info-box li { margin-bottom: 4px; }
</style>
</head>
<body>

<div class="cover">
  <h1>Admin Guide</h1>
  <div class="gold-rule"></div>
  <h2>Administrator Edition &mdash; Pilot Version 1.0</h2>
  <p class="confidential">Confidential &mdash; Internal Use Only</p>
  <p class="date">June 2026</p>
</div>

<div class="toc">
  <div class="page-header"><span class="brand">AiForm Procure</span><span>Admin Guide</span></div>
  <div class="chapter-label">Contents</div>
  <h2 class="chapter-title">Table of Contents</h2>
  <div class="gold-rule"></div>
  <div class="toc-item"><span><span class="toc-num">1</span>Dashboard Overview</span></div>
  <div class="toc-item"><span><span class="toc-num">2</span>Supplier Verification</span></div>
  <div class="toc-item"><span><span class="toc-num">3</span>User Management</span></div>
  <div class="toc-item"><span><span class="toc-num">4</span>Analytics and Reports</span></div>
  <div class="toc-item"><span><span class="toc-num">5</span>Platform Settings</span></div>
  <div class="toc-item"><span><span class="toc-num">6</span>FAQs and Troubleshooting</span></div>
</div>

<div class="chapter">
  <div class="page-header"><span class="brand">AiForm Procure</span><span>Admin Guide</span></div>
  <div class="chapter-label">Chapter 1</div>
  <h2 class="chapter-title">Dashboard Overview</h2>
  <div class="gold-rule"></div>
  <p class="chapter-desc">Read metrics, understand stats, and navigate admin workspaces.</p>
  <p style="color:#555; margin-bottom:16px;">The admin dashboard gives you a real-time view of platform activity including active RFQs, supplier registrations, verification queue size, and procurement spend.</p>
  <div class="info-box">
    <h4>Key metrics explained</h4>
    <ul>
      <li>Active RFQs: Total open requests for quotation on the platform</li>
      <li>Quotes Received: Supplier responses to active RFQs</li>
      <li>Active Contracts: Contracts currently in progress</li>
      <li>YTD Spend: Total procurement spend year to date</li>
    </ul>
  </div>
</div>

<div class="chapter">
  <div class="page-header"><span class="brand">AiForm Procure</span><span>Admin Guide</span></div>
  <div class="chapter-label">Chapter 2</div>
  <h2 class="chapter-title">Supplier Verification</h2>
  <div class="gold-rule"></div>
  <p class="chapter-desc">Review applications, approve or reject suppliers, and manage queues.</p>
  <h3>Steps</h3>
  <div class="steps">
    <div class="step"><div class="step-num">1</div><div class="step-text">Go to Dashboard then Verifications</div></div>
    <div class="step"><div class="step-num">2</div><div class="step-text">Click Review supplier on any pending application</div></div>
    <div class="step"><div class="step-num">3</div><div class="step-text">Check business details, uploaded documents, and CSD number</div></div>
    <div class="step"><div class="step-num">4</div><div class="step-text">Click Approve to verify the supplier or Reject with a reason</div></div>
    <div class="step"><div class="step-num">5</div><div class="step-text">Supplier receives an email notification of the decision</div></div>
  </div>
  <h3>Frequently Asked Questions</h3>
  <div class="faq">
    <div class="faq-item"><div class="faq-q">How do I re-open a rejected application?</div><div class="faq-a">Find the supplier in the user list and change their verification status back to Pending in the database via Supabase SQL Editor.</div></div>
    <div class="faq-item"><div class="faq-q">What documents should I check before approving?</div><div class="faq-a">Tax clearance certificate, BBBEE certificate, CSD registration, and banking confirmation letter.</div></div>
  </div>
</div>

<div class="chapter">
  <div class="page-header"><span class="brand">AiForm Procure</span><span>Admin Guide</span></div>
  <div class="chapter-label">Chapter 3</div>
  <h2 class="chapter-title">User Management</h2>
  <div class="gold-rule"></div>
  <p class="chapter-desc">Manage accounts, roles, and delete users.</p>
  <div class="info-box">
    <h4>Key actions</h4>
    <ul>
      <li>View all users: Dashboard then Admin then Users</li>
      <li>Change user role: Edit profile in Supabase profiles table</li>
      <li>Delete account: Use the Delete account function &mdash; data is soft-deleted for 30 days then permanently removed</li>
    </ul>
  </div>
</div>

<div class="chapter">
  <div class="page-header"><span class="brand">AiForm Procure</span><span>Admin Guide</span></div>
  <div class="chapter-label">Chapter 4</div>
  <h2 class="chapter-title">Analytics and Reports</h2>
  <div class="gold-rule"></div>
  <p class="chapter-desc">Use Spend Analysis, Compliance Report, and BBBEE Scorecard.</p>
  <div class="info-box">
    <h4>Spend Analysis</h4>
    <ul>
      <li>YTD spend totals</li>
      <li>Spend by category and province</li>
      <li>Top suppliers by spend</li>
      <li>Spend over time chart</li>
    </ul>
  </div>
  <div class="info-box">
    <h4>Compliance Report</h4>
    <ul>
      <li>Verification status breakdown</li>
      <li>BBBEE distribution</li>
      <li>Document completion rates</li>
      <li>Non-compliant supplier list</li>
    </ul>
  </div>
  <div class="info-box">
    <h4>BBBEE Scorecard</h4>
    <ul>
      <li>BBBEE spend split</li>
      <li>Spend by BBBEE level</li>
      <li>Supplier directory by level</li>
      <li>Compliance trend over time</li>
    </ul>
  </div>
</div>

<div class="chapter">
  <div class="page-header"><span class="brand">AiForm Procure</span><span>Admin Guide</span></div>
  <div class="chapter-label">Chapter 5</div>
  <h2 class="chapter-title">Platform Settings</h2>
  <div class="gold-rule"></div>
  <p class="chapter-desc">Manage system settings and email templates.</p>
  <div class="info-box">
    <h4>Key settings</h4>
    <ul>
      <li>Email templates: Customise verification approval and rejection emails</li>
      <li>SMTP configuration: Manage email sender settings</li>
      <li>User roles: Assign admin, supplier, or buyer roles</li>
    </ul>
  </div>
</div>

<div class="chapter">
  <div class="page-header"><span class="brand">AiForm Procure</span><span>Admin Guide</span></div>
  <div class="chapter-label">Chapter 6</div>
  <h2 class="chapter-title">FAQs and Troubleshooting</h2>
  <div class="gold-rule"></div>
  <p class="chapter-desc">Admin-specific issues and escalation paths.</p>
  <div class="faq">
    <div class="faq-item"><div class="faq-q">A supplier says they did not receive their verification email &mdash; what do I do?</div><div class="faq-a">Check the Supabase Auth logs for email delivery status. Verify the SMTP settings are correctly configured. Manually resend from Supabase Auth then Users if needed.</div></div>
    <div class="faq-item"><div class="faq-q">How do I reset a user's password?</div><div class="faq-a">Go to Supabase Auth then Users, find the user, and click Send password reset email.</div></div>
    <div class="faq-item"><div class="faq-q">A user's SmartScore is not updating &mdash; what do I check?</div><div class="faq-a">Confirm the profile was saved after changes. Check the profiles table in Supabase to confirm the score column was written. If not, trigger a manual recalculation by updating any profile field and saving.</div></div>
  </div>
</div>

</body>
</html>
`;

async function main() {
  fs.mkdirSync(path.join(__dirname, '../public/help'), { recursive: true });

  await generatePDF(
    userGuideHTML,
    path.join(__dirname, '../public/help/user-guide.pdf')
  );

  await generatePDF(
    adminGuideHTML,
    path.join(__dirname, '../public/help/admin-guide.pdf')
  );

  console.log('Both PDFs generated successfully.');
}

main().catch(console.error);
