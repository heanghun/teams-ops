import { json } from './presentation.js';
import { hasNativeSignIn, nativeSignInFetch } from './sign-in.js';

export function cloudflareProductionWorker(worker) {
  return {
    async fetch(request, env, ctx) {
      const url = new URL(request.url);
      if (url.protocol !== 'https:' || url.hostname !== env.TEAMS_APP_HOST) {
        return json({error:'This hostname is unavailable for TEAMS Operations.'}, 404);
      }
      const audience = env.TEAMS_ACCESS_AUD?.trim();
      const native = hasNativeSignIn(env);
      if (env.TEAMS_MODE !== 'team' || (!native&&!audience) || !env.TEAMS_OWNER_EMAIL?.trim() || !env.DB || !env.BUCKET) {
        return json({error:'The production workspace is being configured.'}, 503);
      }
      const headers = new Headers(request.headers);
      headers.delete('oai-authenticated-user-id');
      headers.delete('oai-authenticated-user-email');
      headers.delete('x-teams-native-account');
      headers.delete('x-teams-auth-method');
      if (url.pathname === '/api/mail/webhook' && request.method === 'POST') {
        // The mailbox handler verifies the signature on the original request body.
        return worker.fetch(new Request(request, {headers}), env, ctx);
      }
      if(native)return nativeSignInFetch(request,env,ctx,worker,headers);
      if (url.pathname === '/signout-with-chatgpt' && request.method === 'GET') {
        return new Response(null, {status:302, headers:{Location:'/cdn-cgi/access/logout','Cache-Control':'no-store'}});
      }
      if (!ctx?.access || ctx.access.aud !== audience) {
        return json({error:'Sign in through the TEAMS Cloudflare Access application.'}, 401);
      }
      let identity;
      try {
        identity = await ctx.access.getIdentity();
      } catch {
        return json({error:'The sign-in service is temporarily unavailable.'}, 503);
      }
      const email = typeof identity?.email === 'string' ? identity.email.trim().toLowerCase() : '';
      if (!/^[!-~]{3,254}$/.test(email) || !/^[^@]+@[^@]+$/.test(email)) {
        return json({error:'Sign in with a verified TEAMS email address.'}, 401);
      }
      headers.set('oai-authenticated-user-id', 'cloudflare-access:'+email);
      headers.set('oai-authenticated-user-email', email);
      return worker.fetch(new Request(request, {headers}), env, ctx);
    },
    scheduled(controller,env,ctx){
      return worker.scheduled?.(controller,env,ctx);
    },
  };
}
