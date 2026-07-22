import nodemailer from 'nodemailer';

const RECEIVER_EMAIL = process.env.QUOTE_RECEIVER_EMAIL || 'andreccnapenha@gmail.com';

const createTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || '0');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) {
    throw new Error(
      'SMTP configuration is required. Set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS in environment variables.'
    );
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });
};

const renderQuoteHtml = ({ clientName, clientEmail, clientPhone, eventName, organizerEmail, quote }) => {
  const itemsHtml = (quote.items || [])
    .map(item => `<li>${item.title} - ${item.info} - R$ ${item.total.toFixed(2)}</li>`)
    .join('');

  return `
    <h1>Orçamento DJ The Source</h1>
    <p><strong>Cliente</strong>: ${clientName || 'Não informado'}</p>
    <p><strong>Email do cliente</strong>: ${clientEmail || 'Não informado'}</p>
    <p><strong>Telefone</strong>: ${clientPhone || 'Não informado'}</p>
    <p><strong>Evento</strong>: ${eventName || 'Não informado'}</p>
    <p><strong>Email do organizador</strong>: ${organizerEmail || 'Não informado'}</p>
    <p><strong>Valor final</strong>: R$ ${quote.total?.toFixed(2) ?? '0.00'}</p>
    <h2>Itens do orçamento</h2>
    <ul>
      ${itemsHtml}
    </ul>
    <p><strong>Salão</strong>: ${quote.salon || 'Não selecionado'}</p>
    <p>Mensagem enviada pelo sistema DJ The Source.</p>
  `;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { clientName, clientEmail, clientPhone, organizerEmail, eventName, quote } = req.body;

    if (!clientName || !clientEmail || !eventName || !quote || !Array.isArray(quote.items) || quote.items.length === 0) {
      return res.status(400).json({ error: 'clientName, clientEmail, eventName and quote with at least one item are required' });
    }

    const transporter = createTransporter();
    const html = renderQuoteHtml({ clientName, clientEmail, clientPhone, eventName, organizerEmail, quote });

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to: RECEIVER_EMAIL,
      subject: 'Novo orçamento recebido - DJ The Source',
      html
    });

    return res.status(200).json({ status: 'sent', messageId: info.messageId });
  } catch (error) {
    console.error('Erro ao enviar orçamento:', error);
    return res.status(500).json({ error: error?.message || 'Erro interno ao enviar orçamento' });
  }
}
