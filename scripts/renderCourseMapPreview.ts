// Dev helper: writes the course map HTML with the real seeded markers to the
// path given as argv[2], for eyeballing the Leaflet document in a browser.
import { writeFileSync } from 'fs';
import { buildCourseMapHtml } from '../lib/courseMapHtml';

const markers = [
  { id: '1', name: 'Grafarholtsvöllur', club: 'GR', latitude: 64.12057, longitude: -21.76782 },
  { id: '2', name: 'Korpa Landið/Áin', club: 'GR', latitude: 64.14977, longitude: -21.76237 },
  { id: '12', name: 'Landið', club: 'GR', latitude: 64.14977, longitude: -21.76237 },
  { id: '13', name: 'Ljúflingur', club: 'Oddur', latitude: 64.0615, longitude: -21.89554 },
  { id: '3', name: 'Hvaleyrarvöllur', club: 'Keilir', latitude: 64.05788, longitude: -21.99497 },
  { id: '4', name: 'Urriðavöllur', club: 'Oddur', latitude: 64.0615, longitude: -21.89554 },
  { id: '5', name: 'Hlíðavöllur', club: 'GM', latitude: 64.16816, longitude: -21.7407 },
  { id: '6', name: 'Nesvöllur', club: 'NK', latitude: 64.15227, longitude: -22.03015 },
  { id: '7', name: 'Jaðarsvöllur', club: 'GA', latitude: 65.66686, longitude: -18.11671 },
  { id: '8', name: 'Garðavöllur', club: 'Leynir', latitude: 64.31939, longitude: -22.02943 },
  { id: '9', name: 'Leirdalsvöllur', club: 'GKG', latitude: 64.08668, longitude: -21.87808 },
  { id: '10', name: 'Mýrin', club: 'GKG', latitude: 64.08621, longitude: -21.88151 },
  { id: '11', name: 'Húsafell', club: 'GHF', latitude: 64.69792, longitude: -20.87833 },
];

writeFileSync(process.argv[2], buildCourseMapHtml(markers));
console.log(`wrote ${process.argv[2]}`);
