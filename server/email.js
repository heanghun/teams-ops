import { DomainError } from './domain.js';

export function emailConnection(env,demo){
  const ready=env.TEAMS_EMAIL_OUTBOUND_ENABLED!=='false'&&env.TEAMS_RESEND_API_KEY&&env.TEAMS_EMAIL_FROM;
  return {mode:demo?'simulation':ready?'configured':'unconfigured',sender:!demo&&ready?env.TEAMS_EMAIL_FROM:null};
}
