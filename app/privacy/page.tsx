export const metadata = {title:'TripMate Privacy'};
export default function Privacy(){
 return <main style={{maxWidth:750,margin:'40px auto',padding:'24px',lineHeight:1.75,color:'#244336'}}>
   <a href="/" style={{color:'#27694e'}}>← Back to TripMate</a>
   <h1>Privacy information</h1>
   <p>TripMate is a prototype travel planner. Trips you save in the app are stored locally in your browser, not synchronized to a TripMate account. Clearing your browser data can remove your saved trips.</p>
   <p>When you request an AI itinerary, your trip preferences are sent through our server to Google's Gemini service. When you select a place to retrieve Google Maps ratings, the place name, locality and optional approximate coordinates are sent through our server to Google Places API (New). Ratings are fetched on demand, and we do not add Google Places results to your saved trips.</p>
   <p>The app also uses map tiles and routing providers to show maps and estimated distances. Hosting and third-party providers may process standard request and technical logs.</p>
   <p>Learn about Google's <a href="https://policies.google.com/privacy" style={{color:'#27694e'}}>Privacy Policy</a> and <a href="https://maps.google.com/help/terms_maps/" style={{color:'#27694e'}}>Google Maps Terms</a>.</p>
   <p>This MVP should not be used to store passwords, identity documents or sensitive personal information in trip notes.</p>
 </main>
}