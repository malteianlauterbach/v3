import AirtablePlus from 'airtable-plus'
import fetch from 'isomorphic-unfetch'
import Cors from 'cors'
import initMiddleware from '../../lib/init-middleware'

const cors = initMiddleware(
  Cors({
    methods: ['GET', 'POST']
  })
)

const joinTable = new AirtablePlus({
  apiKey: process.env.AIRTABLE_API_KEY,
  baseID: 'appaqcJtn33vb59Au',
  tableName: 'Join Requests'
})

export default async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', '*')
  await cors(req, res)
  if (req.method === 'POST') {
    let data
    try {
      data = JSON.parse(req.body)
    } catch {
      data = req.body
    }
    console.log(data)

    const exists = await isDuplicate(data.name, data.email, data.reason)
    const empty = await isEmpty(data)

    if (!exists && !empty) {
      await joinTable.create({
        'Full Name': data.name,
        'Email Address': data.email,
        Student: data.teen,
        Reason: data.reason
      })
      if (data.teen) {
        let postData = {
          channel: 'G0132DNFE7J', // G0147KPNHU0
          blocks: [
            {
              "type": "section",
              "text": {
                "type": "mrkdwn",
                "text": "Someone just requested to join the Slack."
              }
            },
            {
              "type": "section",
              "text": {
                "type": "mrkdwn",
                "text": `*Full name:* ${data.name}\n*Email:* ${data.email}\n*Student:* ${data.teen ? 'true' : 'false'}\n*Reason:* ${data.reason}`
              }
            },
            {
              "type": "actions",
              "elements": [
                {
                  "type": "button",
                  "text": {
                    "type": "plain_text",
                    "emoji": true,
                    "text": "Send Invitation"
                  },
                  "style": "primary",
                  "action_id": "invite_member"
                },
                {
                  "type": "button",
                  "text": {
                    "type": "plain_text",
                    "emoji": true,
                    "text": "Deny"
                  },
                  "style": "danger",
                  "action_id": "deny"
                }
              ]
            }
          ]
        }
        await fetch('https://slack.com/api/chat.postMessage', {
          method: 'post',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`
          },
          body: JSON.stringify(postData)
        }).catch(err => console.error(err))
      }
    }
    res.status(200).json({ status: 'success' })
  }
}

async function isDuplicate(name, email, reason) {
  reason = reason.replace(`'`, `\\'`)
  const exists = await joinTable.read({
    filterByFormula: `AND({Full Name} = '${name}', {Email Address} = '${email}', Reason = '${reason}')`
  })
  return typeof exists[0] !== 'undefined'
}

function isEmpty(jsonObject) {
  let empty = true
  for (let key of Object.entries(jsonObject)) {
    if (key[1] !== '' && key[0] !== 'teen') {
      empty = false
      break
    }
  }
  return empty
}
