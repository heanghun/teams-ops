// Demo identity changes commit only after the matching authorized state arrives.
// The server remains responsible for authorization; real accounts cannot use this switcher.
export const roleHome=Object.freeze({admin:'home',director:'home',manager:'home',mep:'home',estimator:'quotes',project:'projects',procurement:'procurement',warehouse:'inventory',maintenance:'maintenance',technician:'maintenance',finance:'billing',adminSupport:'hr',auditor:'reports',installation_lead:'projects',installation_technician:'projects',maintenance_lead:'maintenance',logistics:'procurement'});
export function createRoleSession({state,fetchState,people=()=>[],persist=()=>{}}){
  let generation=0,switching=false;
  const stillCurrent=(token,role,preview)=>token===generation&&state.role===role&&state.previewId===preview;
  return {
    get switching(){return switching;},
    async read(){
      if(switching)return false;
      const token=++generation,role=state.role,preview=state.previewId;
      try{
        const next=await fetchState(role);
        if(!stillCurrent(token,role,preview))return false;
        state.data=next;state.error=null;return true;
      }catch(error){if(!stillCurrent(token,role,preview))return false;throw error;}
    },
    async switch(role,personId=''){
      if(switching)return false;
      if(!state.data?.demoRoles?.includes(role))throw Error('This demonstration role is unavailable. Refresh and choose a listed role.');
      const candidates=people(role),person=candidates.find(item=>item.id===personId)||candidates[0],token=++generation;
      switching=true;
      try{
        const next=await fetchState(role);
        if(token!==generation)return false;
        if(!next.demoRoles?.includes(role)||!next.actor?.roles?.includes(role))throw Error('The requested role was not applied. Your current role is unchanged.');
        state.role=role;state.picId=person?.id||'';state.data=next;state.error=null;
        persist(role,state.picId);return true;
      }finally{switching=false;}
    },
  };
}
