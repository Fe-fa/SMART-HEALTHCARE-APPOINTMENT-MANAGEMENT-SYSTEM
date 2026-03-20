import axios from 'axios';

interface StkPushRequest {
  phoneNumber: string;
  amount: number;
  accountReference: string;
  transactionDesc: string;
}

export const mpesaService = {
  async initiateStkPush(payload: StkPushRequest) {
    // Get the JWT token from your storage (localStorage/Cookie)
    const token = localStorage.getItem('access_token'); 

    const { data } = await axios.post(
      'http://localhost:3000/api/v1/mpesa/stkpush', 
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`, // This fixes your 401
        }
      }
    );
    return data;
  },

  async checkStatus(checkoutId: string) {
    const token = localStorage.getItem('access_token');
    const { data } = await axios.get(
      `http://localhost:3000/api/v1/mpesa/stkpush-query?checkoutRequestId=${checkoutId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return data;
  }
};