const venueWords=/\b(stadiums?|stadia|arenas?|ball\s?parks?|venues?|concessions?|vendors?)\b/i;
const patterns=[
 ['FOOD-A',/\b(food stands?|food stalls?|grill|burger stands?|food booths?)\b/i],
 ['FOOD-B',/\b(two|2|both)\s+food\s+(stands|stalls|booths)\b|\b(tacos?|second food stand)\b/i],
 ['BEER',/\b(beer|lager|ale)\b/i],['MERCH',/\b(merch(?:andise)?|souvenirs?)\b/i],
 ['SNACK',/\b(snacks?|popcorn|pretzels?)\b/i],['COFFEE',/\b(coffee|espresso|roaster)\b/i]
];
export function parseStadiumIdea(text){
 if(!venueWords.test(text))return null;
 const mix=patterns.filter(([,pattern])=>pattern.test(text)).map(([id])=>id);
 return {values:{type:'stadium',mix},status:{type:'parsed',mix:mix.length?'parsed':'defaulted'},questions:mix.length?{}:{mix:'Which independent stands should share this venue?'}};
}
