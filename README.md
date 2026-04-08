A custom-built app for Redwood Financial employees to send email campaigns to prospective clients

## Observability

LogRocket is initialized on the client with `redwood-financial/redwood-email-sender`.
Set `NEXT_PUBLIC_LOGROCKET_APP_ID` to override that app id for another environment.

Server logs are structured JSON and include an `event` field for filtering in
Netlify logs. Email bodies and recipient lists are not logged.
