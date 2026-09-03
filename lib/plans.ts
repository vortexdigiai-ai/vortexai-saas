export const PLANS = {
  free:{name:'Free',price:0,messages:100,features:['Chatbot IA','Catálogo básico','Personalización básica']},
  starter:{name:'Starter',price:49,messages:1000,features:['Todo Free','Widget e instalación','Carritos abandonados','Flujos híbridos']},
  growth:{name:'Growth',price:99,messages:5000,features:['Todo Starter','Analíticas avanzadas','Recomendador','Cross-selling']},
  pro:{name:'Pro',price:249,messages:20000,features:['Todo Growth','IA persuasiva','Prioridad','Automatizaciones avanzadas']},
  custom:{name:'Custom',price:null,messages:null,features:['A medida','Límites personalizados','Soporte dedicado']}
} as const;
export type Plan = keyof typeof PLANS;
export const PRICE_TO_PLAN: Record<string,Plan> = {
  price_1U8HNI4BKoMqdBrq4rVw96P3:'starter',
  price_1U8HPf4BKoMqdBrqX5nNTVq8:'growth',
  price_1U8HRO4BKoMqdBrqWiVP5gIv:'pro'
};
export const PLAN_RANK: Record<Plan,number> = {free:0,starter:1,growth:2,pro:3,custom:4};
export function hasPlan(current: string|undefined, required: Plan) { return (PLAN_RANK[(current as Plan)] ?? 0) >= PLAN_RANK[required]; }
