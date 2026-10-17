export const metadata = {title:'TripMate Privacy'};
export default function Privacy(){
 return <main style={{maxWidth:750,margin:'40px auto',padding:'24px',lineHeight:1.75,color:'#244336'}}>
   <a href="/" style={{color:'#27694e'}}>← Back to TripMate</a>
   <h1>Privacy information</h1>
   <p>TripMate is a prototype travel planner. Trips you save in the app are stored locally in your browser, not synchronized to a TripMate account. Clearing your browser data can remove your saved trips.</p>
   <p>When you request an AI itinerary, your trip preferences are sent through our server to Google's Gemini service only when that feature is configured. When you explicitly select a stop for place details, its name, locality and optional approximate coordinates are sent through our server to the Wikipedia/Wikimedia APIs and the OpenStreetMap Nominatim service. When you request nearby dining suggestions, the selected stop coordinates are compared with a static, source-verified OpenStreetMap food database bundled in TripMate. No live third-party request is made for food suggestions. The dataset may be refreshed separately during maintenance from free OpenStreetMap/BBBike extracts; its snapshot date is exposed by our API. Wikipedia and OpenStreetMap lookup details are not automatically stored in your saved trips; a venue you explicitly choose is saved as part of that trip in your browser. No Google Places API, billing key, or rating API is needed.</p>
   <p>The app also uses map tiles and routing providers to show maps and estimated distances. Hosting and third-party providers may process standard request and technical logs.</p>
   <p>Learn about <a href="https://foundation.wikimedia.org/wiki/Policy:Privacy_policy" style={{color:'#27694e'}}>Wikimedia's privacy policy</a> and <a href="https://osmfoundation.org/wiki/Privacy_Policy" style={{color:'#27694e'}}>OpenStreetMap Foundation's privacy policy</a>. External directions links may open another provider if you choose them.</p>
   <p>This MVP should not be used to store passwords, identity documents or sensitive personal information in trip notes.</p>
 </main>
}