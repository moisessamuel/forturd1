import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

interface TicketEmailData {
  playerName: string
  playerEmail: string
  ticketNumbers: string[]
  totalAmount: number
  moneda: string
  qrCodeUrl: string
  purchaseDate: string
}

export async function sendTicketApprovalEmail(data: TicketEmailData) {
  const { playerName, playerEmail, ticketNumbers, totalAmount, moneda, qrCodeUrl, purchaseDate } = data

  const formattedAmount = moneda === 'USD' 
    ? `US$ ${totalAmount.toLocaleString('en-US')}` 
    : `${totalAmount.toLocaleString('es-DO')} DOP`

  const ticketList = ticketNumbers.map(num => `<li style="padding: 8px 0; border-bottom: 1px solid #333;">#${num}</li>`).join('')

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #111; border-radius: 16px; overflow: hidden; border: 1px solid #222;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%); padding: 40px 30px; text-align: center; border-bottom: 2px solid #DAA520;">
              <h1 style="margin: 0; color: #DAA520; font-size: 32px; font-weight: bold; text-shadow: 0 0 20px rgba(218, 165, 32, 0.5);">FortuRD</h1>
              <p style="margin: 10px 0 0; color: #888; font-size: 14px;">Tu suerte empieza aqui</p>
            </td>
          </tr>
          
          <!-- Success Badge -->
          <tr>
            <td style="padding: 30px 30px 20px; text-align: center;">
              <div style="display: inline-block; background-color: rgba(34, 197, 94, 0.2); border: 1px solid #22c55e; border-radius: 50px; padding: 12px 24px;">
                <span style="color: #22c55e; font-size: 16px; font-weight: bold;">COMPRA APROBADA</span>
              </div>
            </td>
          </tr>
          
          <!-- Greeting -->
          <tr>
            <td style="padding: 0 30px 20px;">
              <h2 style="margin: 0; color: #fff; font-size: 24px;">Hola ${playerName},</h2>
              <p style="margin: 15px 0 0; color: #aaa; font-size: 16px; line-height: 1.6;">
                Tu compra de boletos ha sido verificada y aprobada exitosamente. A continuacion encontraras los detalles de tu compra.
              </p>
            </td>
          </tr>
          
          <!-- Purchase Details -->
          <tr>
            <td style="padding: 0 30px 30px;">
              <div style="background-color: #1a1a1a; border-radius: 12px; padding: 24px; border: 1px solid #333;">
                <h3 style="margin: 0 0 20px; color: #DAA520; font-size: 18px; border-bottom: 1px solid #333; padding-bottom: 10px;">Detalles de la Compra</h3>
                
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 10px 0; color: #888; font-size: 14px;">Fecha:</td>
                    <td style="padding: 10px 0; color: #fff; font-size: 14px; text-align: right;">${purchaseDate}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #888; font-size: 14px;">Cantidad de boletos:</td>
                    <td style="padding: 10px 0; color: #fff; font-size: 14px; text-align: right;">${ticketNumbers.length}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #888; font-size: 14px;">Monto total:</td>
                    <td style="padding: 10px 0; color: #22c55e; font-size: 16px; font-weight: bold; text-align: right;">${formattedAmount}</td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
          
          <!-- Ticket Numbers -->
          <tr>
            <td style="padding: 0 30px 30px;">
              <div style="background-color: #1a1a1a; border-radius: 12px; padding: 24px; border: 1px solid #333;">
                <h3 style="margin: 0 0 20px; color: #DAA520; font-size: 18px; border-bottom: 1px solid #333; padding-bottom: 10px;">Tus Numeros de Boletos</h3>
                <ul style="margin: 0; padding: 0; list-style: none; color: #fff; font-size: 18px; font-weight: bold;">
                  ${ticketList}
                </ul>
              </div>
            </td>
          </tr>
          
          <!-- QR Code -->
          ${qrCodeUrl ? `
          <tr>
            <td style="padding: 0 30px 30px; text-align: center;">
              <div style="background-color: #1a1a1a; border-radius: 12px; padding: 24px; border: 1px solid #333;">
                <h3 style="margin: 0 0 20px; color: #DAA520; font-size: 18px;">Codigo QR de Validacion</h3>
                <img src="${qrCodeUrl}" alt="QR Code" style="width: 200px; height: 200px; border-radius: 8px; background: #fff; padding: 10px;" />
                <p style="margin: 15px 0 0; color: #888; font-size: 12px;">Presenta este codigo para validar tu compra</p>
              </div>
            </td>
          </tr>
          ` : ''}
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #0a0a0a; padding: 30px; text-align: center; border-top: 1px solid #222;">
              <p style="margin: 0 0 10px; color: #666; font-size: 12px;">Este es un correo automatico, por favor no responda.</p>
              <p style="margin: 0; color: #DAA520; font-size: 14px; font-weight: bold;">FortuRD - Tu suerte empieza aqui</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

  const mailOptions = {
    from: `"FortuRD" <${process.env.EMAIL_USER}>`,
    to: playerEmail,
    subject: 'Tu compra de boletos FortuRD ha sido aprobada',
    html: htmlContent,
  }

  return transporter.sendMail(mailOptions)
}

// Email for pending purchase (when purchase is created)
export async function sendTicketPendingEmail(data: TicketEmailData) {
  const { playerName, playerEmail, ticketNumbers, totalAmount, moneda, purchaseDate } = data

  const formattedAmount = moneda === 'USD' 
    ? `US$ ${totalAmount.toLocaleString('en-US')}` 
    : `${totalAmount.toLocaleString('es-DO')} DOP`

  const ticketList = ticketNumbers.map(num => `<li style="padding: 8px 0; border-bottom: 1px solid #333;">#${num}</li>`).join('')

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #111; border-radius: 16px; overflow: hidden; border: 1px solid #222;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%); padding: 40px 30px; text-align: center; border-bottom: 2px solid #DAA520;">
              <h1 style="margin: 0; color: #DAA520; font-size: 32px; font-weight: bold; text-shadow: 0 0 20px rgba(218, 165, 32, 0.5);">FortuRD</h1>
              <p style="margin: 10px 0 0; color: #888; font-size: 14px;">Tu suerte empieza aqui</p>
            </td>
          </tr>
          
          <!-- Pending Badge -->
          <tr>
            <td style="padding: 30px 30px 20px; text-align: center;">
              <div style="display: inline-block; background-color: rgba(234, 179, 8, 0.2); border: 1px solid #eab308; border-radius: 50px; padding: 12px 24px;">
                <span style="color: #eab308; font-size: 16px; font-weight: bold;">COMPRA PENDIENTE DE VERIFICACION</span>
              </div>
            </td>
          </tr>
          
          <!-- Greeting -->
          <tr>
            <td style="padding: 0 30px 20px;">
              <h2 style="margin: 0; color: #fff; font-size: 24px;">Hola ${playerName},</h2>
              <p style="margin: 15px 0 0; color: #aaa; font-size: 16px; line-height: 1.6;">
                Hemos recibido tu compra de boletos. Actualmente esta <strong style="color: #eab308;">pendiente de verificacion</strong>. 
                Te notificaremos por correo cuando tu compra sea aprobada.
              </p>
            </td>
          </tr>
          
          <!-- Purchase Details -->
          <tr>
            <td style="padding: 0 30px 30px;">
              <div style="background-color: #1a1a1a; border-radius: 12px; padding: 24px; border: 1px solid #333;">
                <h3 style="margin: 0 0 20px; color: #DAA520; font-size: 18px; border-bottom: 1px solid #333; padding-bottom: 10px;">Detalles de la Compra</h3>
                
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 10px 0; color: #888; font-size: 14px;">Estado:</td>
                    <td style="padding: 10px 0; color: #eab308; font-size: 14px; font-weight: bold; text-align: right;">Pendiente</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #888; font-size: 14px;">Fecha:</td>
                    <td style="padding: 10px 0; color: #fff; font-size: 14px; text-align: right;">${purchaseDate}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #888; font-size: 14px;">Cantidad de boletos:</td>
                    <td style="padding: 10px 0; color: #fff; font-size: 14px; text-align: right;">${ticketNumbers.length}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #888; font-size: 14px;">Monto total:</td>
                    <td style="padding: 10px 0; color: #DAA520; font-size: 16px; font-weight: bold; text-align: right;">${formattedAmount}</td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
          
          <!-- Ticket Numbers -->
          <tr>
            <td style="padding: 0 30px 30px;">
              <div style="background-color: #1a1a1a; border-radius: 12px; padding: 24px; border: 1px solid #333;">
                <h3 style="margin: 0 0 20px; color: #DAA520; font-size: 18px; border-bottom: 1px solid #333; padding-bottom: 10px;">Tus Numeros de Boletos (Reservados)</h3>
                <ul style="margin: 0; padding: 0; list-style: none; color: #fff; font-size: 18px; font-weight: bold;">
                  ${ticketList}
                </ul>
                <p style="margin: 15px 0 0; color: #888; font-size: 12px;">* Estos numeros seran confirmados una vez se verifique tu pago.</p>
              </div>
            </td>
          </tr>
          
          <!-- Info Box -->
          <tr>
            <td style="padding: 0 30px 30px;">
              <div style="background-color: rgba(234, 179, 8, 0.1); border-radius: 12px; padding: 20px; border: 1px solid rgba(234, 179, 8, 0.3);">
                <p style="margin: 0; color: #eab308; font-size: 14px; text-align: center;">
                  <strong>Importante:</strong> Por favor asegurate de haber enviado el comprobante de pago. 
                  El proceso de verificacion puede tomar hasta 24 horas.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #0a0a0a; padding: 30px; text-align: center; border-top: 1px solid #222;">
              <p style="margin: 0 0 10px; color: #666; font-size: 12px;">Este es un correo automatico, por favor no responda.</p>
              <p style="margin: 0; color: #DAA520; font-size: 14px; font-weight: bold;">FortuRD - Tu suerte empieza aqui</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

  const mailOptions = {
    from: `"FortuRD" <${process.env.EMAIL_USER}>`,
    to: playerEmail,
    subject: 'Tu compra de boletos FortuRD esta pendiente de verificacion',
    html: htmlContent,
  }

  return transporter.sendMail(mailOptions)
}
