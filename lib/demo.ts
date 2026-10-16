import { Activity, Currency, Trip, TripInput, uuid } from './types';

const landmarkSets: Record<string, { country: string; center: [number, number]; stops: Array<[string, string, string, number, number, string]> }> = {
  kyoto: {
    country: 'Japan', center: [35.0116, 135.7681],
    stops: [
      ['Fushimi Inari Taisha', 'Fushimi Ward', 'Walk the famous vermilion torii paths.', 34.9671, 135.7727, 'sightseeing'],
      ['Nishiki Market', 'Nakagyo Ward', 'Browse local delicacies and small food stalls.', 35.0051, 135.7647, 'food'],
      ['Gion', 'Higashiyama Ward', 'Stroll through Kyoto’s historic streets.', 35.0030, 135.7786, 'culture'],
      ['Arashiyama Bamboo Grove', 'Ukyo Ward', 'Explore the peaceful bamboo paths.', 35.0170, 135.6713, 'nature'],
      ['Tenryu-ji', 'Arashiyama', 'Visit the temple gardens and surrounding area.', 35.0158, 135.6738, 'culture'],
      ['Kinkaku-ji', 'Kita Ward', 'See the iconic Golden Pavilion grounds.', 35.0394, 135.7292, 'sightseeing'],
      ['Kiyomizu-dera', 'Higashiyama Ward', 'Enjoy hillside temple architecture and views.', 34.9949, 135.7850, 'culture'],
      ['Philosopher’s Path', 'Sakyo Ward', 'Follow a canal-side walking route.', 35.0235, 135.7936, 'nature'],
      ['Nijo Castle', 'Nakagyo Ward', 'Discover historic architecture and gardens.', 35.0142, 135.7481, 'culture'],
      ['Pontocho Alley', 'Central Kyoto', 'Find dinner and stroll along the narrow lane.', 35.0067, 135.7707, 'food'],
    ]
  },
  'ho chi minh city': {
    country: 'Vietnam', center: [10.7769, 106.7009],
    stops: [
      ['Central Post Office', 'District 1', 'Admire French-era architecture.',10.7797,106.6990,'culture'],
      ['Ben Thanh Market', 'District 1', 'Browse market stalls and local snacks.',10.7725,106.6980,'food'],
      ['Nguyen Hue Walking Street', 'District 1', 'Enjoy a walk through the city center.',10.7744,106.7035,'sightseeing'],
      ['War Remnants Museum', 'District 3', 'Explore historical exhibitions.',10.7795,106.6922,'culture'],
      ['Tao Dan Park', 'District 1', 'Take a peaceful green-space break.',10.7757,106.6908,'nature']
    ]
  },
  'da nang': { country: 'Vietnam', center: [16.0544,108.2022], stops: [
    ['My Khe Beach','Coastal Da Nang','Enjoy a seaside walk.',16.0611,108.2455,'nature'],
    ['Dragon Bridge','Hai Chau','See the city’s iconic bridge.',16.0610,108.2273,'sightseeing'],
    ['Marble Mountains','Ngu Hanh Son','Explore caves and viewpoints.',16.0045,108.2635,'nature']
  ] }
};
const genericStops: Array<[string, string, string, string]> = [
 ['Explore the historic center', 'City center', 'Get oriented with a self-guided walk and local landmarks.', 'sightseeing'],
 ['Taste local specialties', 'Local food district', 'Try regional dishes at a place you choose after checking reviews.', 'food'],
 ['Visit a museum or gallery', 'Museum district', 'Pick a cultural stop matching your interests.', 'culture'],
 ['Find a scenic green space', 'Park or waterfront', 'Build in a relaxed outdoor break.', 'nature'],
 ['Discover a neighborhood', 'Local neighborhood', 'Explore cafes, shops and everyday life.', 'sightseeing'],
 ['Enjoy a memorable dinner', 'Local restaurant', 'Choose a restaurant after confirming opening hours.', 'food']
];
export function daysBetween(start: string, end: string) {
 const ms = Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`);
 return Number.isFinite(ms) ? Math.max(1, Math.round(ms / 86400000) + 1) : 1;
}
export function addDays(date: string, n: number) {
 const dt = new Date(`${date}T00:00:00Z`); dt.setUTCDate(dt.getUTCDate() + n); return dt.toISOString().slice(0,10);
}
function act(idx: number, title: string, location: string, description: string, category: Activity['category'], cost: number, lat?: number, lng?: number): Activity {
  return { id: uuid(), time: ['09:00','12:30','16:00'][idx % 3], title, location, description, durationMinutes: [90,75,110][idx%3], category, cost: Math.round(cost), ...(lat !== undefined && lng !== undefined ? {lat,lng}: {}) };
}
export function createDemoTrip(input: TripInput): Trip {
 const n = daysBetween(input.startDate,input.endDate);
 const dataset = landmarkSets[input.destination.trim().toLowerCase()];
 const currencyFactor: Record<Currency,number> = { USD:1, VND:25000, EUR:0.93, JPY:150 };
 const days = Array.from({length:n}, (_, day) => ({
   date: addDays(input.startDate,day),
   theme: ['First impressions & local flavors','Culture, stories & hidden corners','Nature & scenic escapes','Markets, memories & favorites'][day%4],
   activities: Array.from({length:3}, (_, index) => {
     if (dataset) {
       const s=dataset.stops[(day*3+index)%dataset.stops.length];
       return act(index,s[0],s[1],s[2],s[5] as Activity['category'],[8,22,12][index]*currencyFactor[input.currency],s[3],s[4]);
     }
     const s=genericStops[(day*3+index)%genericStops.length];
     return act(index,s[0],s[1],s[2],s[3] as Activity['category'],[8,22,12][index]*currencyFactor[input.currency]);
   })
 }));
 return {
   id:uuid(), destination:input.destination.trim(), country:dataset?.country || 'Destination to explore',
   startDate:input.startDate, endDate:input.endDate, travelers:input.travelers, budget:input.budget,
   currency:input.currency, pace:input.pace, interests:input.interests, notes:input.notes, days,
   expenses:[], createdAt:new Date().toISOString(), mode:'demo',
   summary: dataset ? `An inspiring ${n}-day starter itinerary for ${input.destination}, mixing iconic sights and local experiences.` : `A customizable ${n}-day sample structure for ${input.destination}. Replace the generic places with verified local attractions.`,
   tips: ['This demo uses sample cost estimates, not live prices.', 'Check transport times, ticket requirements and opening hours before traveling.', 'Accommodation and flights are not included unless added to your budget.']
 };
}
export const sampleInput: TripInput = { destination:'Kyoto', startDate:'2026-11-10', endDate:'2026-11-13', travelers:2, budget:650, currency:'USD', pace:'balanced', interests:['Culture','Food','Nature'], notes:'' };
export const demoCities = [
 {name:'Kyoto', country:'Japan', caption:'Traditions & tranquil temples', symbol:'⛩️', tint:'pink'},
 {name:'Da Nang', country:'Vietnam', caption:'Coastal escapes & adventure', symbol:'🌴', tint:'blue'},
 {name:'Ho Chi Minh City', country:'Vietnam', caption:'City energy & street food', symbol:'🌆', tint:'yellow'}
];