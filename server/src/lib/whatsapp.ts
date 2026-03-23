import axios from 'axios';

const WHATSAPP_VERSION = 'v18.0';
const BASE_URL = `https://graph.facebook.com/${WHATSAPP_VERSION}`;

export const sendWhatsAppMessage = async (to: string, messageData: any) => {
  const url = `${BASE_URL}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  
  try {
    const response = await axios.post(
      url,
      {
        messaging_product: 'whatsapp',
        to,
        ...messageData,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error: any) {
    console.error('Error sending WhatsApp message:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Example: Send a rich template message
 */
export const sendTemplateMessage = async (to: string, templateName: string, languageCode: string, components: any[]) => {
  return sendWhatsAppMessage(to, {
    type: 'template',
    template: {
      name: templateName,
      language: {
        code: languageCode,
      },
      components,
    },
  });
};

/**
 * Example: Send an interactive button message
 */
export const sendButtonMessage = async (to: string, bodyText: string, buttons: { id: string; title: string }[]) => {
  return sendWhatsAppMessage(to, {
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: bodyText },
      action: {
        buttons: buttons.map((btn) => ({
          type: 'reply',
          reply: { id: btn.id, title: btn.title },
        })),
      },
    },
  });
};
