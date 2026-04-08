'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import LogRocket from 'logrocket';

let logRocketInitialized = false;

const LOGROCKET_APP_ID =
  process.env.NEXT_PUBLIC_LOGROCKET_APP_ID ||
  'redwood-financial/redwood-email-sender';

export default function LogRocketInitializer() {
  const { data: session } = useSession();

  useEffect(() => {
    if (!logRocketInitialized) {
      LogRocket.init(LOGROCKET_APP_ID);
      logRocketInitialized = true;
    }

    if (session?.user?.email) {
      LogRocket.identify(session.user.email, {
        email: session.user.email,
        name: session.user.name || ''
      });
    }
  }, [session?.user?.email, session?.user?.name]);

  return null;
}
