import { DomainError } from './domain.js';

export function emailConnection(env,demo){
  return {mode:demo?'simulation':env.TEAMS_RESEND_API_KEY&&env.TEAMS_EMAIL_FROM?'configured':'unconfigured',
    sender:!demo&&env.TEAMS_RESEND_API_KEY&&env.TEAMS_EMAIL_FROM?env.TEAMS_EMAIL_FROM:null};
}
