import fetch, {RequestInit} from 'node-fetch';

async function jsonFetch(url: string, options: RequestInit) {
  const res = await fetch(url, options);
  const json = await res.json();
  console.log(url, json);
  return json;
}

export async function addSubscriber(email: string) {
  await jsonFetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE}/Subscribers`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.AIRTABLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      records: [{fields: {Email: email}}],
    }),
  });
}

export async function updateSubscriber(id: string) {
  await jsonFetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE}/Subscribers/${id}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${process.env.AIRTABLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: {'Last Notified': new Date().toISOString()},
    }),
  });
}

export async function removeSubscriber(id: string) {
  await jsonFetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE}/Subscribers/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${process.env.AIRTABLE_KEY}`,
    },
  });
}

export async function getSubscribers() {
  const {records} = (await jsonFetch(
    `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE}/Subscribers`,
    {
      headers: {
        Authorization: `Bearer ${process.env.AIRTABLE_KEY}`,
      },
    }
  )) as {
    records: {id: string; fields: {Email: string; Created: string; 'Last Notified': string}}[];
  };
  return records.map(({id, fields: {Email, Created, 'Last Notified': lastNotified}}) => ({
    id,
    email: Email,
    created: Created,
    lastNotified,
  }));
}

export async function sendNotification(id: string, email: string) {
  return await jsonFetch(`https://api.postmarkapp.com/email/withTemplate`, {
    method: 'POST',
    headers: {
      'X-Postmark-Server-Token': `${process.env.POSTMARK}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      From: 'Swarmation <play@swarmation.com>',
      To: email,
      TemplateAlias: 'notification',
      TemplateModel: {id},
    }),
  });
}
