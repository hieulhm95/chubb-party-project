import nodemailer from 'nodemailer';

export async function sendEmailWithBase64Image(to: string, qrCodeImage: string) {
  const transporter = nodemailer.createTransport({
    host: 'smtp.hostinger.com', // Hostinger SMTP server
    port: 465, // Secure SMTP port
    secure: true, // Use SSL
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Email Template</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #f4f4f4;
    }
    .container {
      width: 100%;
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      padding: 20px;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      padding: 10px 0;
    }
    .content {
      padding: 20px;
    }
    .footer {
      text-align: center;
      padding: 10px 0;
      font-size: 12px;
      color: #888888;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      <p>Xin chào Tấn Phát,</p>
      <p>Anh/Chị vừa nhận được một thông điệp chân thành từ một người đồng đội tại Chubb Life Việt Nam. Đây là món quà đặc biệt dành riêng cho Anh/Chị.</p>
      <p>Mã QR code thông điệp của Anh/Chị: <img src="cid:qrcode" alt="QR Code" /></p>

      <p>Để lắng nghe thông điệp này, Anh/Chị hãy mang mã QR code đến sự kiện Annual Staff Party 2025 nhé!
Thời gian sử dụng QR code thông điệp: 17:00 – 18:00, ngày 10/01/2025
Thời gian sự kiện: 17:00 – 22:00, ngày 10/01/2025Địa điểm: The Adora Center, 431 Hoàng Văn Thụ, Phường 4, Q. Tân Bình, TP.HCM</p>
<p>Cùng Chubb Life Việt Nam trải nghiệm khoảnh khắc ý nghĩa này và lắng nghe những nhịp đập từ trái tim! 💓</p>
<p>Hẹn gặp Anh/Chị tại Annual Staff Party 2025</p>
<p>Trân trọng, <br /> Ban tổ chức Annual Staff Party 2025.</p>

<p>Mọi thắc mắc hoặc đề xuất vui lòng liên hệ:<br/>
HR – Trần Đức Minh | <a href="mailto:DucMinh.Tran@chubb.com">DucMinh.Tran@chubb.com</a> <br/>
E&A – Nguyễn Tấn Phát | <a href="mailto:DucMinh.Tran@chubb.com">TanPhat.Nguyen@chubb.com</a></p>
    </div>
    <div class="footer">
      <p>&copy; 2024 CHUBB. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: 'Annual Staff Party 2025 - Thông điệp đặc biệt từ đồng đội!',
    html: htmlContent,
    attachments: [
      {
        filename: 'image.png',
        content: qrCodeImage.split('base64,')[1],
        encoding: 'base64',
        cid: 'qrcode', // same cid value as in the html img src
      },
    ],
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: ' + info.response);
  } catch (error) {
    console.error('Error sending email: ', error);
  }
}
