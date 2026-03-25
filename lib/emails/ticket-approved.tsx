import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
  Hr,
  Row,
  Column,
} from '@react-email/components'

interface TicketApprovedEmailProps {
  playerName: string
  ticketNumbers: string[]
  totalAmount: number
  moneda: string
  qrCodeUrl: string
  purchaseDate: string
}

export function TicketApprovedEmail({
  playerName,
  ticketNumbers,
  totalAmount,
  moneda,
  qrCodeUrl,
  purchaseDate,
}: TicketApprovedEmailProps) {
  const formattedAmount = moneda === 'USD' 
    ? `US$ ${totalAmount.toLocaleString('en-US')}` 
    : `${totalAmount.toLocaleString('es-DO')} DOP`

  return (
    <Html>
      <Head />
      <Preview>Tu compra de boletos FortuRD ha sido aprobada</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={logo}>FortuRD</Heading>
            <Text style={tagline}>Tu suerte empieza aqui</Text>
          </Section>

          <Hr style={divider} />

          {/* Main Content */}
          <Section style={content}>
            <Heading style={title}>Compra Aprobada</Heading>
            <Text style={greeting}>Hola {playerName},</Text>
            <Text style={paragraph}>
              Tu compra de boletos ha sido aprobada exitosamente. A continuacion encontraras los detalles de tu compra.
            </Text>
          </Section>

          {/* Purchase Details */}
          <Section style={detailsBox}>
            <Heading as="h3" style={detailsTitle}>Detalles de la Compra</Heading>
            
            <Row style={detailRow}>
              <Column style={detailLabel}>Fecha:</Column>
              <Column style={detailValue}>{purchaseDate}</Column>
            </Row>
            
            <Row style={detailRow}>
              <Column style={detailLabel}>Cantidad:</Column>
              <Column style={detailValue}>{ticketNumbers.length} boleto(s)</Column>
            </Row>
            
            <Row style={detailRow}>
              <Column style={detailLabel}>Monto:</Column>
              <Column style={detailValue}>{formattedAmount}</Column>
            </Row>

            <Hr style={dividerSmall} />
            
            <Text style={ticketsLabel}>Numeros de Boletos:</Text>
            <Text style={ticketsList}>
              {ticketNumbers.map(num => `#${num}`).join(', ')}
            </Text>
          </Section>

          {/* QR Code */}
          <Section style={qrSection}>
            <Text style={qrTitle}>Tu Codigo QR</Text>
            <Text style={qrSubtitle}>
              Presenta este codigo en el evento para validar tus boletos
            </Text>
            <Img
              src={qrCodeUrl}
              width="200"
              height="200"
              alt="Codigo QR de tus boletos"
              style={qrImage}
            />
          </Section>

          <Hr style={divider} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Gracias por confiar en FortuRD. Te deseamos mucha suerte!
            </Text>
            <Text style={footerSmall}>
              Este correo fue enviado automaticamente. Por favor no responda a este mensaje.
            </Text>
            <Text style={footerSmall}>
              FortuRD - Todos los derechos reservados
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// Styles
const main = {
  backgroundColor: '#0a0a0a',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
}

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '580px',
}

const header = {
  textAlign: 'center' as const,
  padding: '32px 20px',
}

const logo = {
  color: '#DAA520',
  fontSize: '36px',
  fontWeight: 'bold',
  margin: '0 0 8px 0',
  textShadow: '0 0 10px rgba(218, 165, 32, 0.5)',
}

const tagline = {
  color: '#888888',
  fontSize: '14px',
  margin: '0',
}

const divider = {
  borderColor: '#333333',
  margin: '0',
}

const dividerSmall = {
  borderColor: '#333333',
  margin: '16px 0',
}

const content = {
  padding: '32px 20px',
}

const title = {
  color: '#22c55e',
  fontSize: '28px',
  fontWeight: 'bold',
  textAlign: 'center' as const,
  margin: '0 0 24px 0',
}

const greeting = {
  color: '#ffffff',
  fontSize: '18px',
  margin: '0 0 16px 0',
}

const paragraph = {
  color: '#cccccc',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0',
}

const detailsBox = {
  backgroundColor: '#1a1a1a',
  borderRadius: '12px',
  padding: '24px',
  margin: '0 20px 24px 20px',
  border: '1px solid #333333',
}

const detailsTitle = {
  color: '#DAA520',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 16px 0',
}

const detailRow = {
  marginBottom: '8px',
}

const detailLabel = {
  color: '#888888',
  fontSize: '14px',
  width: '100px',
}

const detailValue = {
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600',
}

const ticketsLabel = {
  color: '#888888',
  fontSize: '14px',
  margin: '0 0 8px 0',
}

const ticketsList = {
  color: '#DAA520',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0',
  wordBreak: 'break-word' as const,
}

const qrSection = {
  textAlign: 'center' as const,
  padding: '24px 20px',
  backgroundColor: '#111111',
  margin: '0 20px',
  borderRadius: '12px',
}

const qrTitle = {
  color: '#ffffff',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 8px 0',
}

const qrSubtitle = {
  color: '#888888',
  fontSize: '14px',
  margin: '0 0 16px 0',
}

const qrImage = {
  margin: '0 auto',
  borderRadius: '8px',
  backgroundColor: '#ffffff',
  padding: '8px',
}

const footer = {
  textAlign: 'center' as const,
  padding: '32px 20px',
}

const footerText = {
  color: '#888888',
  fontSize: '14px',
  margin: '0 0 16px 0',
}

const footerSmall = {
  color: '#666666',
  fontSize: '12px',
  margin: '0 0 4px 0',
}

export default TicketApprovedEmail
