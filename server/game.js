export const SUITS = ["♠", "♥", "♦", "♣"];
export const VALUES = ["3","4","5","6","J","Q","K","7","A"]; // 40 cartas (sem 2,8,9,10)

const BASE_RANK = Object.fromEntries(VALUES.map((v,i)=>[v,i]));

export function cardPoints(card){
  switch(card.v){
    case "7": return 10;
    case "A": return 11;
    case "K": return 4;
    case "Q": return 3;
    case "J": return 2;
    default: return 0;
  }
}

export function makeDeck(){
  const d=[];
  for(const s of SUITS) for(const v of VALUES) d.push({v,s,id:`${v}${s}`});
  return d;
}

export function shuffle(a){
  for(let i=a.length-1;i>0;i--){
    const j=(Math.random()*(i+1))|0;
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}

export function isUniversalTrump(c,trumpSuit){
  if(c.v==="Q" && c.s==="♠") return true;           // dama fina
  if(c.v==="3" && c.s==="♣") return true;           // zangão
  if(c.v==="A" && c.s==="♣") return true;           // pé de pinto
  if(trumpSuit==="♣" && c.v==="A" && c.s==="♦") return true; // dourado
  return false;
}

export function isTrump(c,trumpSuit){
  return c.s===trumpSuit || isUniversalTrump(c,trumpSuit);
}

// Hierarquia final (menor->maior):
// 3 4 5 6 J Q K 7 dourado(=A♦ se trunfo=♣) pé(A♣) zangão(3♣) dama fina(Q♠) A
export function strengthRank(c,trumpSuit){
  if(trumpSuit==="♣" && c.v==="A" && c.s==="♦") return 100; // dourado
  if(c.v==="A" && c.s==="♣") return 110; // pé de pinto
  if(c.v==="3" && c.s==="♣") return 120; // zangão
  if(c.v==="Q" && c.s==="♠") return 130; // dama fina
  if(c.v==="A") return 140; // ás final
  return BASE_RANK[c.v];
}

export function trickWinner(trick,trumpSuit){
  const leadSuit = trick[0].card.s;
  const trumps = trick.filter(t=>isTrump(t.card,trumpSuit));
  const pool = trumps.length ? trumps : trick.filter(t=>t.card.s===leadSuit);
  let best=pool[0];
  for(const t of pool.slice(1)) if(strengthRank(t.card,trumpSuit) > strengthRank(best.card,trumpSuit)) best=t;
  return best.seat;
}

export function teamOfSeat(seat){
  return (seat%2===0)?0:1; // 0&2 vs 1&3
}

export function nextSeat(seat){
  return (seat+1)%4;
}

export function canSwapTrump(faceUp,trumpSuit,hand){
  if(!faceUp) return false;
  if(trumpSuit==="♣") return hand.some(c=>c.v==="4" && c.s==="♣");
  return hand.some(c=>c.v==="3" && c.s===trumpSuit);
}

export function swapTrump(faceUp,trumpSuit,hand){
  const h=hand.slice();
  const idx = trumpSuit==="♣" ? h.findIndex(c=>c.v==="4" && c.s==="♣") : h.findIndex(c=>c.v==="3" && c.s===trumpSuit);
  if(idx===-1) return null;
  const exchange=h[idx];
  h.splice(idx,1,faceUp);
  return { newFaceUpCard: exchange, newHand: h };
}
